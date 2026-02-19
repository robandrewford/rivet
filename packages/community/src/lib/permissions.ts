import type snowflake from "snowflake-sdk";
import { createUserConnection, querySnowflake, destroyConnection } from "./snowflake";

/**
 * Queries IS_ROLE_IN_SESSION on an existing Snowflake connection.
 * Shared implementation used by both OAuth and key-pair auth paths.
 * Never throws — caller is responsible for destroying the connection.
 */
async function queryPermissionTier(
  connection: snowflake.Connection
): Promise<"standard" | "elevated"> {
  const elevatedRole = (
    process.env.SNOWFLAKE_ELEVATED_ROLE ?? "GDAI_ELEVATED"
  ).toUpperCase();
  const sql = `SELECT IS_ROLE_IN_SESSION('${elevatedRole}') AS IS_ELEVATED`;
  const rows = await querySnowflake(connection, sql);
  const row = rows[0] as Record<string, unknown> | undefined;
  return row?.IS_ELEVATED === true ? "elevated" : "standard";
}

/**
 * Resolves the permission tier for a user from their OAuth access token.
 * Creates a Snowflake connection, queries IS_ROLE_IN_SESSION, destroys the connection.
 * Fails closed: any error returns "standard". Never throws.
 */
export async function resolvePermissionTier(
  accessToken: string
): Promise<"standard" | "elevated"> {
  let connection: snowflake.Connection | null = null;
  try {
    connection = await createUserConnection(accessToken);
    return await queryPermissionTier(connection);
  } catch {
    return "standard";
  } finally {
    if (connection) destroyConnection(connection);
  }
}

/**
 * Resolves the permission tier from an existing Snowflake connection.
 * Used by the dev key-pair auth path where the connection is already established.
 * Fails closed: any error returns "standard". Never throws.
 */
export async function resolvePermissionTierFromConnection(
  connection: snowflake.Connection
): Promise<"standard" | "elevated"> {
  try {
    return await queryPermissionTier(connection);
  } catch {
    return "standard";
  }
}
