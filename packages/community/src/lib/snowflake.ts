import snowflake from "snowflake-sdk";

/**
 * Creates a per-request Snowflake connection authenticated via OAuth token.
 * No connection pooling — each call creates a new connection scoped to the user's token.
 */
export function createUserConnection(
  accessToken: string
): Promise<snowflake.Connection> {
  const connection = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT!,
    authenticator: "OAUTH",
    token: accessToken,
  });

  return new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) {
        reject(err);
      } else {
        resolve(conn);
      }
    });
  });
}

/**
 * Executes a SQL statement on an existing Snowflake connection.
 * Returns the result rows, or an empty array if no rows are returned.
 */
export function querySnowflake(
  connection: snowflake.Connection,
  sql: string,
  binds?: snowflake.Binds
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      binds,
      complete: (err, _stmt, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows ?? []);
        }
      },
    });
  });
}

/**
 * Creates a per-request Snowflake connection authenticated via key-pair (RSA private key).
 * Used for local development — requires SNOWFLAKE_PRIVATE_KEY_PATH env var.
 * No connection pooling.
 */
export function createKeyPairConnection(
  username: string
): Promise<snowflake.Connection> {
  const connection = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username,
    authenticator: "SNOWFLAKE_JWT",
    privateKeyPath: process.env.SNOWFLAKE_PRIVATE_KEY_PATH!,
    ...(process.env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE && {
      privateKeyPassphrase: process.env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE,
    }),
  });

  return new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) {
        reject(err);
      } else {
        resolve(conn);
      }
    });
  });
}

/**
 * Destroys a Snowflake connection. Fire-and-forget — errors are silently ignored.
 */
export function destroyConnection(connection: snowflake.Connection): void {
  connection.destroy(() => {});
}
