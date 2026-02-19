import NextAuth from "next-auth";
import AzureAD from "next-auth/providers/azure-ad";
import type { UserId } from "@/lib/users";
import { resolvePermissionTier } from "./permissions";

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
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      if (token.expires_at && nowSeconds > (token.expires_at as number)) {
        // Token expired — return as-is; Plan 01-03 adds refresh logic
        return token;
      }

      return token;
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
