import NextAuth from "next-auth";
import AzureAD from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import type { UserId } from "@/lib/users";
import { createKeyPairConnection, destroyConnection } from "./snowflake";
import { resolvePermissionTier, resolvePermissionTierFromConnection } from "./permissions";

// Minimal shape describing the JWT fields we read/write in refreshAccessToken.
// Avoids importing JWT from @auth/core/jwt which has a version mismatch between
// next-auth@5.0.0-beta.3's internal @auth/core (0.0.0-manual) and our direct
// @auth/core (0.18.0) dependency.
interface RefreshableToken {
  access_token?: string;
  expires_at?: number;
  refresh_token?: string;
  permissionTier?: "standard" | "elevated";
  devAuth?: boolean;
  error?: "RefreshTokenError";
  [key: string]: unknown;
}

/**
 * Attempts to refresh the Azure AD access token using the refresh token.
 * Never throws — returns { ...token, error: "RefreshTokenError" } on any failure.
 */
async function refreshAccessToken(token: RefreshableToken): Promise<RefreshableToken> {
  // tenantId is parsed lazily inside refreshAccessToken so it doesn't crash when
  // AUTH_MICROSOFT_ENTRA_ID_ISSUER is absent (e.g. when using dev key-pair auth).
  const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER?.split("/")[3];
  if (!tenantId) return { ...token, error: "RefreshTokenError" as const };

  try {
    const scope = ["openid", "profile", "email", "offline_access", process.env.SNOWFLAKE_OAUTH_SCOPE]
      .filter(Boolean)
      .join(" ");

    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
          client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
          grant_type: "refresh_token",
          refresh_token: token.refresh_token ?? "",
          scope,
        }),
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newTokens = (await response.json()) as Record<string, any>;

    if (!response.ok) {
      return { ...token, error: "RefreshTokenError" as const };
    }

    return {
      ...token,
      access_token: newTokens.access_token as string,
      expires_at: Math.floor(Date.now() / 1000 + (newTokens.expires_in as number)),
      refresh_token: (newTokens.refresh_token as string | undefined) ?? token.refresh_token,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" as const };
  }
}

// Build provider list based on environment.
// Either (or both) can be active; at least one must be configured.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [];

// ─── Dev auth: Snowflake key-pair (no Azure AD required) ──────────────────────
// Enable with: SNOWFLAKE_DEV_AUTH=true
// Requires: SNOWFLAKE_ACCOUNT, SNOWFLAKE_PRIVATE_KEY_PATH, and optionally
//           SNOWFLAKE_PRIVATE_KEY_PASSPHRASE, SNOWFLAKE_ELEVATED_ROLE
if (process.env.SNOWFLAKE_DEV_AUTH === "true") {
  providers.push(
    CredentialsProvider({
      id: "snowflake-keypair",
      name: "Snowflake (Dev)",
      credentials: {
        username: { label: "Snowflake Username", type: "text", placeholder: "your.name@company.com" },
      },
      async authorize(credentials) {
        if (!credentials?.username) return null;
        const username = credentials.username as string;
        let connection: import("snowflake-sdk").Connection | null = null;
        try {
          connection = await createKeyPairConnection(username);
          const permissionTier = await resolvePermissionTierFromConnection(connection);
          return {
            id: username,
            name: username,
            email: username,
            // Pass permissionTier to JWT callback via the user object
            permissionTier,
          };
        } catch {
          // Connection failed — invalid credentials or misconfigured key
          return null;
        } finally {
          if (connection) destroyConnection(connection);
        }
      },
    })
  );
}

// ─── Production auth: Microsoft Entra ID (Azure AD) ───────────────────────────
// Note: Provider is named AzureAD in next-auth@5.0.0-beta.3 (renamed to
// microsoft-entra-id in later betas). Functionality is identical.
// If SNOWFLAKE_OAUTH_SCOPE is set, access_token targets Snowflake directly.
// See 01-RESEARCH.md Open Question 3 for OBO fallback if needed.
if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID) {
  providers.push(
    AzureAD({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      authorization: {
        params: {
          scope: ["openid", "profile", "email", "offline_access", process.env.SNOWFLAKE_OAUTH_SCOPE]
            .filter(Boolean)
            .join(" "),
        },
      },
    })
  );
}

const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // ── Azure AD initial sign-in ──────────────────────────────────────────
      if (account) {
        token.access_token = (account.access_token ?? "") as string;
        token.expires_at = (account.expires_at ?? 0) as number;
        token.refresh_token = account.refresh_token as string | undefined;
        token.permissionTier = await resolvePermissionTier(account.access_token!);
        return token;
      }

      // ── Snowflake key-pair initial sign-in ────────────────────────────────
      // user is populated by the CredentialsProvider authorize() return value.
      // Double cast through unknown to satisfy strict type checking.
      const userAny = user as unknown as Record<string, unknown> | undefined;
      if (userAny?.permissionTier) {
        token.permissionTier = userAny.permissionTier as "standard" | "elevated";
        token.devAuth = true; // mark as dev session — skip Azure AD token refresh
        return token;
      }

      // ── Token still valid — return as-is ─────────────────────────────────
      // Dev auth sessions have no real expires_at, so they never expire.
      if (token.devAuth || Date.now() < ((token.expires_at as number) - 5) * 1000) {
        return token;
      }

      // ── Azure AD token expired — attempt refresh ──────────────────────────
      // Permission tier is NOT re-resolved on refresh.
      return refreshAccessToken(token) as ReturnType<typeof refreshAccessToken> & typeof token;
    },

    async session({ session, token }) {
      session.access_token = token.access_token as string;
      session.permissionTier = (token.permissionTier as "standard" | "elevated") ?? "standard";
      if (token.error) {
        session.error = token.error as "RefreshTokenError";
      }
      if (session.user) {
        session.user.id = (token.sub ?? "") as UserId;
      }
      return session;
    },
  },
});

export { handlers, auth, signIn, signOut };
export const { GET, POST } = handlers;
