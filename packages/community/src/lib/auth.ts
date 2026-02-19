import NextAuth from "next-auth";
import AzureAD from "next-auth/providers/azure-ad";
import type { UserId } from "@/lib/users";
import { resolvePermissionTier } from "./permissions";

// Parse tenant ID from issuer URL (e.g. https://login.microsoftonline.com/{tenantId}/v2.0)
const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!.split("/")[3];

// Minimal shape describing the JWT fields we read/write in refreshAccessToken.
// Avoids importing JWT from @auth/core/jwt which has a version mismatch between
// next-auth@5.0.0-beta.3's internal @auth/core (0.0.0-manual) and our direct
// @auth/core (0.18.0) dependency.
interface RefreshableToken {
  access_token?: string;
  expires_at?: number;
  refresh_token?: string;
  permissionTier?: "standard" | "elevated";
  error?: "RefreshTokenError";
  [key: string]: unknown;
}

/**
 * Attempts to refresh the access token using the refresh token.
 * Never throws — returns { ...token, error: "RefreshTokenError" } on any failure.
 */
async function refreshAccessToken(token: RefreshableToken): Promise<RefreshableToken> {
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
      // Use new refresh_token if provided; fall back to existing
      refresh_token: (newTokens.refresh_token as string | undefined) ?? token.refresh_token,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" as const };
  }
}

// Note: MicrosoftEntraID is branded as AzureAD in next-auth@5.0.0-beta.3.
// The provider was renamed to microsoft-entra-id in later beta versions.
const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    AzureAD({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      // If SNOWFLAKE_OAUTH_SCOPE is set, access_token targets Snowflake directly.
      // See 01-RESEARCH.md Open Question 3 for OBO fallback.
      authorization: {
        params: {
          scope: ["openid", "profile", "email", "offline_access", process.env.SNOWFLAKE_OAUTH_SCOPE]
            .filter(Boolean)
            .join(" "),
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.access_token = (account.access_token ?? "") as string;
        token.expires_at = (account.expires_at ?? 0) as number;
        token.refresh_token = account.refresh_token as string | undefined;
        token.permissionTier = await resolvePermissionTier(account.access_token!);
        return token;
      }

      // Token still valid (with 5-second buffer) — return as-is
      if (Date.now() < ((token.expires_at as number) - 5) * 1000) {
        return token;
      }

      // Token expired — attempt refresh (permission tier NOT re-resolved)
      return refreshAccessToken(token) as ReturnType<typeof refreshAccessToken> & typeof token;
    },
    async session({ session, token }) {
      session.access_token = token.access_token as string;
      session.permissionTier = (token.permissionTier as "standard" | "elevated") ?? "standard";
      if (token.error) {
        session.error = token.error as "RefreshTokenError";
      }
      // Populate user.id from the JWT subject (Microsoft's unique user identifier)
      if (session.user) {
        session.user.id = (token.sub ?? "") as UserId;
      }
      return session;
    },
  },
});

export { handlers, auth, signIn, signOut };
export const { GET, POST } = handlers;
