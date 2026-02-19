import type { UserId } from "@/lib/users";

declare module "@auth/core/jwt" {
  interface JWT {
    access_token: string;
    expires_at: number;
    refresh_token?: string;
    permissionTier?: "standard" | "elevated";
    error?: "RefreshTokenError";
    snowflake_token?: string;
  }
}

declare module "next-auth" {
  interface Session {
    access_token: string;
    permissionTier: "standard" | "elevated";
    error?: "RefreshTokenError";
    user: {
      id: UserId;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
