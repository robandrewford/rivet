import { createUserConnection, querySnowflake, destroyConnection } from "./snowflake";

/**
 * Resolves the permission tier for a user by checking their active Snowflake roles.
 *
 * Uses IS_ROLE_IN_SESSION to check whether the elevated role is active in the session
 * established by the user's own OAuth token. Role name is always uppercased (IS_ROLE_IN_SESSION
 * is case-sensitive).
 *
 * Fails closed: any error returns "standard". Never throws.
 */
export async function resolvePermissionTier(
  accessToken: string
): Promise<"standard" | "elevated"> {
  const elevatedRole = (
    process.env.SNOWFLAKE_ELEVATED_ROLE ?? "GDAI_ELEVATED"
  ).toUpperCase();
  const sql = `SELECT IS_ROLE_IN_SESSION('${elevatedRole}') AS IS_ELEVATED`;

  let connection: import("snowflake-sdk").Connection | null = null;
  try {
    connection = await createUserConnection(accessToken);
    const rows = await querySnowflake(connection, sql);
    const row = rows[0] as Record<string, unknown> | undefined;
    return row?.IS_ELEVATED === true ? "elevated" : "standard";
  } catch {
    // Fail closed — any error grants standard tier
    return "standard";
  } finally {
    if (connection) {
      destroyConnection(connection);
    }
  }
}
