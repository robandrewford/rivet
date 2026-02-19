# Phase 1: Auth + Session - Research

**Researched:** 2026-02-19
**Domain:** Microsoft Entra ID SSO, Snowflake External OAuth, Next.js session management
**Confidence:** MEDIUM (architecture decision is an open question; library specifics are HIGH)

---

## Summary

This phase requires wiring Microsoft Entra ID (Azure AD) as the SSO provider, establishing Snowflake sessions scoped to each authenticated user's credentials, and deriving a permission tier (standard vs. elevated) from the user's Snowflake role. The existing Rivet codebase already has `next-auth` 5.0.0-beta.3 in `packages/community` with a Next.js 15 App Router setup — this is the correct shell for GDAI as a web app.

The standard approach is: **next-auth v5 (auth.js) → Microsoft Entra ID provider → JWT session strategy → store access_token in JWT → pass access_token to snowflake-sdk as OAuth token** per connection. Snowflake must have an External OAuth Security Integration configured for Azure AD; the Node.js driver then connects per-user using `authenticator: "OAUTH"` and the user's token. Role determination uses `SELECT CURRENT_ROLE()` or `IS_ROLE_IN_SESSION('ELEVATED_ROLE_NAME')` immediately after connection.

**The biggest open question** is whether next-auth v5 (in beta, primary maintainer departed Jan 2025) is the right long-term choice vs. better-auth (which has absorbed auth.js). For a ~100-user internal healthcare tool, either works technically; next-auth v5 is the safer choice given it's already in the codebase and the Microsoft Entra ID provider is first-class. Better-auth also has a Microsoft provider but adds migration cost.

**Primary recommendation:** Use `packages/community` (Next.js 15) as the GDAI web shell. Swap the GitHub provider for `MicrosoftEntraID` from next-auth v5. Use JWT session strategy (not database). Store the Azure AD `access_token` in the JWT. Use `snowflake-sdk` with `authenticator: "OAUTH"` per request. Query `IS_ROLE_IN_SESSION` for permission tier at login.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | 5.0.0-beta.3 (already in tree) | Microsoft SSO + session management | Already present; first-class MicrosoftEntraID provider; widely deployed in production despite beta label |
| snowflake-sdk | latest (^1.x) | Snowflake Node.js driver with OAuth support | Official Snowflake driver; ships TypeScript types since 2024; supports `authenticator: "OAUTH"` |
| next.js | 15.x (already in community pkg) | App Router shell, server components, route handlers | Already in tree; server components handle auth server-side without client exposure |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @auth/core | 0.18.0 (already in tree) | Core auth primitives used by next-auth v5 | Imported transitively; no direct usage needed |
| iron-session or jose | latest | Encrypt/sign custom session cookies if needed | Only if switching away from next-auth's built-in JWT |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-auth v5 | better-auth | better-auth has active development in 2025, cleaner TS, but adds migration cost and the Microsoft provider is less battle-tested |
| next-auth v5 | @azure/msal-node directly | More control but replaces the full auth framework; much more hand-rolling |
| snowflake-sdk | Snowflake REST API (sql-api) | REST API avoids a Node driver dep but loses type safety, connection pooling semantics, and OAuth connector simplicity |

**Installation (new deps only):**
```bash
npm install snowflake-sdk
# next-auth and @auth/core already present
```

---

## Architecture Patterns

### Deployment Architecture

GDAI is a web app (not desktop). Use `packages/community` as the application shell — it already has Next.js 15 App Router, next-auth wired up, and a route structure. The Tauri desktop path in `packages/app` is irrelevant for GDAI.

**Do not** create a separate Hono server. Next.js Route Handlers (App Router) handle API logic alongside SSR. This is the simplest architecture for ~100 internal users.

### Recommended Project Structure
```
packages/community/src/
├── app/
│   ├── auth/[...nextauth]/route.ts    # Auth.js handler (already exists)
│   ├── api/
│   │   ├── snowflake/route.ts         # Snowflake query proxy (server-side only)
│   │   └── ...
│   ├── middleware.ts                   # Protect all routes (currently empty — needs implementation)
│   └── layout.tsx                     # Root layout
├── lib/
│   ├── auth.ts                        # NextAuth config (replace GitHub → MicrosoftEntraID)
│   ├── snowflake.ts                   # Per-request Snowflake connection factory
│   └── permissions.ts                 # Permission tier resolution
└── types/
    └── next-auth.d.ts                 # Module augmentation for session/JWT
```

### Pattern 1: Microsoft Entra ID Provider (JWT Strategy)

Replace the existing GitHub provider with MicrosoftEntraID. Use JWT strategy (no database needed) so the access_token is available server-side.

```typescript
// Source: https://authjs.dev/getting-started/providers/microsoft-entra-id
// packages/community/src/lib/auth.ts

import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"

// Module augmentation — extend JWT and Session types
declare module "next-auth/jwt" {
  interface JWT {
    access_token: string
    expires_at: number
    refresh_token?: string
    permissionTier?: "standard" | "elevated"
    error?: "RefreshTokenError"
  }
}

declare module "next-auth" {
  interface Session {
    access_token: string
    permissionTier: "standard" | "elevated"
    error?: "RefreshTokenError"
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
      // Request offline_access for refresh token
      authorization: {
        params: {
          scope: "openid profile email offline_access",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      // First login — store access_token and determine permission tier
      if (account) {
        token.access_token = account.access_token!
        token.expires_at = account.expires_at!
        token.refresh_token = account.refresh_token
        // Resolve Snowflake role → permission tier at login time
        token.permissionTier = await resolvePermissionTier(account.access_token!)
      }
      // Token still valid
      if (Date.now() < token.expires_at * 1000) return token
      // Token expired — try refresh
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.access_token = token.access_token
      session.permissionTier = token.permissionTier ?? "standard"
      session.error = token.error
      return session
    },
  },
})
```

**Required env vars:**
```env
AUTH_MICROSOFT_ENTRA_ID_ID="<Application (client) ID>"
AUTH_MICROSOFT_ENTRA_ID_SECRET="<Client secret value>"
AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/<Directory (tenant) ID>/v2.0"
AUTH_SECRET="<random 32-byte secret for JWT signing>"
```

### Pattern 2: Middleware — Redirect Unauthenticated Users

The current `middleware.ts` is empty. It must protect all routes.

```typescript
// Source: https://authjs.dev/getting-started/session-management/protecting
// packages/community/src/app/middleware.ts

import { auth } from "@/lib/auth"

export const middleware = auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/api/auth") {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin)
    return Response.redirect(signInUrl)
  }
})

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

### Pattern 3: Snowflake Connection Per Request (OAuth Token)

The Snowflake Node.js driver accepts the Azure AD access_token directly via `authenticator: "OAUTH"`. Snowflake validates the JWT against the External OAuth Security Integration — no Snowflake-specific credentials are stored server-side.

```typescript
// Source: https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver-authenticate
// packages/community/src/lib/snowflake.ts

import snowflake from "snowflake-sdk"

export async function createUserConnection(accessToken: string) {
  const connection = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT!,       // e.g. "myorg-myaccount"
    authenticator: "OAUTH",
    token: accessToken,
    // username is optional when using OAUTH — Snowflake resolves from token claim
  })

  return new Promise<snowflake.Connection>((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) reject(err)
      else resolve(conn)
    })
  })
}

export async function querySnowflake(
  connection: snowflake.Connection,
  sql: string,
  binds?: snowflake.Binds,
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      binds,
      complete: (err, _stmt, rows) => {
        if (err) reject(err)
        else resolve(rows ?? [])
      },
    })
  })
}
```

### Pattern 4: Permission Tier Determination at Login

Call `IS_ROLE_IN_SESSION` or `CURRENT_ROLE()` immediately after establishing the Snowflake connection at login. Cache result in JWT — no per-request Snowflake call for authorization.

```typescript
// Source: https://docs.snowflake.com/en/sql-reference/functions/is_role_in_session
// packages/community/src/lib/permissions.ts

import { createUserConnection, querySnowflake } from "./snowflake"

const ELEVATED_ROLE = process.env.SNOWFLAKE_ELEVATED_ROLE ?? "GDAI_ELEVATED"

export async function resolvePermissionTier(
  accessToken: string,
): Promise<"standard" | "elevated"> {
  try {
    const conn = await createUserConnection(accessToken)
    const rows = await querySnowflake(
      conn,
      `SELECT IS_ROLE_IN_SESSION('${ELEVATED_ROLE}') AS is_elevated`,
    )
    const row = rows[0] as { IS_ELEVATED: boolean } | undefined
    conn.destroy(() => {})
    return row?.IS_ELEVATED === true ? "elevated" : "standard"
  } catch {
    // If Snowflake connection fails at login, fail closed
    return "standard"
  }
}
```

### Pattern 5: Workflow State Preservation on Token Expiry

This is an application-level concern — next-auth does not handle it. The standard pattern:

1. Detect `session.error === "RefreshTokenError"` or `status === "unauthenticated"` client-side.
2. Serialize current workflow state to `sessionStorage` (tab-scoped, XSS-safer than localStorage).
3. Redirect to sign-in.
4. After sign-in callback, check sessionStorage for saved state and restore.

The key: use next-auth's `signIn()` with `callbackUrl` to return to the correct workflow URL. Workflow step/form data goes in sessionStorage, not the URL.

```typescript
// Client-side pattern — detect expiry and checkpoint
import { signIn, useSession } from "next-auth/react"

function useSessionWatchdog() {
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.error === "RefreshTokenError") {
      // Checkpoint workflow state
      sessionStorage.setItem("gdai:workflow-checkpoint", JSON.stringify(captureWorkflowState()))
      signIn("microsoft-entra-id", { callbackUrl: window.location.href })
    }
  }, [session?.error])
}
```

### Anti-Patterns to Avoid

- **Storing Snowflake credentials server-side as a service account:** Violates the requirement that Snowflake sessions be user-scoped. Snowflake RLS depends on `CURRENT_USER()` resolving to the actual user.
- **Querying Snowflake roles in middleware per request:** Expensive. Resolve permission tier once at login and cache in JWT.
- **Using database adapter for sessions:** Adds infrastructure dependency. JWT strategy is sufficient and avoids needing Redis/Postgres for a 100-user internal tool. (Remove the Vercel KV adapter present in the community package.)
- **Using `EXTERNALBROWSER` authenticator in snowflake-sdk:** Opens a browser window — only works in CLI/desktop contexts. Use `OAUTH` with a pre-obtained token.
- **Storing access_token in localStorage:** XSS risk. The token lives in the httpOnly session cookie via next-auth's JWT strategy.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OIDC/OAuth state machine | Custom PKCE + token exchange | next-auth MicrosoftEntraID provider | Token validation, PKCE, nonce, state param — many XSS/CSRF edge cases |
| Session cookie management | Custom signed cookies | next-auth JWT strategy (`AUTH_SECRET`) | CSRF protection, secure flag, sameSite, httpOnly all handled |
| JWT refresh logic | Custom token refresh | next-auth `jwt` callback with refresh pattern | Token rotation, error propagation, concurrent refresh race conditions |
| Snowflake OAuth token validation | Custom JWT verify | Snowflake External OAuth Security Integration (Snowflake-side) | Snowflake validates the Azure AD JWT signature itself using JWS keys endpoint |

**Key insight:** The access_token issued by Azure AD to the user becomes the Snowflake session credential. The server never generates a Snowflake-specific token — it passes the user's Azure AD token straight through. This means no server-side Snowflake admin credentials are required.

---

## Common Pitfalls

### Pitfall 1: Scope Mismatch Between Azure AD and Snowflake
**What goes wrong:** The Azure AD token doesn't carry the right scopes for Snowflake, so `snowflake.createConnection` with `authenticator: "OAUTH"` returns `error 390318` (invalid/missing scope) or `error 390144` (invalid JWT).
**Why it happens:** Snowflake External OAuth requires the access token to include specific audience (`EXTERNAL_OAUTH_AUDIENCE_LIST`) and the scope must be defined — "if you do not define a scope, the connection attempt to Snowflake will fail" (Snowflake docs).
**How to avoid:** The Azure AD app registration must expose a scope for Snowflake (e.g., `api://<snowflake-app-id>/session:role-any`) and the OAuth client must request it. The MicrosoftEntraID provider `authorization.params.scope` must include this Snowflake-specific scope in addition to standard OIDC scopes.
**Warning signs:** `390318` or `390144` error codes from snowflake-sdk connect callback.

### Pitfall 2: Access Token vs. ID Token Confusion
**What goes wrong:** next-auth's `account.id_token` is passed to Snowflake instead of `account.access_token`. The ID token is for the app; the access token is for the resource (Snowflake).
**Why it happens:** In OAuth/OIDC, the access_token is the bearer credential for the resource server. The id_token identifies the user to the client.
**How to avoid:** Always use `account.access_token` in the `jwt` callback when storing the token for Snowflake use.

### Pitfall 3: Privileged Roles Blocked by Default in External OAuth
**What goes wrong:** A Snowflake user with `ACCOUNTADMIN` or `SECURITYADMIN` cannot connect via External OAuth.
**Why it happens:** Snowflake blocks privileged built-in roles from External OAuth by default to prevent privilege escalation via token theft.
**How to avoid:** Use custom roles (e.g., `GDAI_STANDARD`, `GDAI_ELEVATED`) rather than built-in privileged roles. These custom roles work with External OAuth without special configuration.
**Warning signs:** Connection succeeds for standard users but fails for admins.

### Pitfall 4: next-auth v5 Beta Instability
**What goes wrong:** Breaking API changes between beta versions, or security patches that require migration.
**Why it happens:** next-auth v5 is still `5.0.0-beta.3` in the tree; the primary maintainer departed January 2025; the project transitioned to better-auth's stewardship for security patches only.
**How to avoid:** Pin the version. Don't chase latest beta. The API surface used (provider config, jwt/session callbacks, middleware) is stable. Monitor for security advisories only.
**Warning signs:** `npm outdated` shows new beta versions with breaking changes.

### Pitfall 5: Token Expiry During Long Workflows
**What goes wrong:** User is mid-workflow (30+ minutes), Azure AD access_token expires (typically 1 hour), next request to Snowflake fails with `390318`.
**Why it happens:** Azure AD tokens have a hard expiry. Refresh token rotation works for the next-auth session but the Snowflake connection receives a stale token if not refreshed before use.
**How to avoid:** (a) Request `offline_access` scope to get a refresh token. (b) Implement refresh token rotation in the `jwt` callback (standard pattern documented in next-auth). (c) Check `session.error` client-side and re-authenticate. (d) Checkpoint workflow state to sessionStorage before redirecting.

### Pitfall 6: Snowflake RLS Requires Correct User Identity
**What goes wrong:** Row-level security policies using `CURRENT_USER()` return incorrect results if connections are pooled or if the session is not scoped to the actual user.
**Why it happens:** Connection pooling reuses connections across users.
**How to avoid:** Do not pool Snowflake connections across users. Create a new connection per request using the user's own token. This is stateless and correct for a web app. The performance cost is acceptable for ~100 users.

### Pitfall 7: IS_ROLE_IN_SESSION Case Sensitivity
**What goes wrong:** `IS_ROLE_IN_SESSION('elevated_role')` returns FALSE even though the user has the role.
**Why it happens:** Snowflake role names are stored uppercase by default; the function is case-sensitive.
**How to avoid:** Always use uppercase role names: `IS_ROLE_IN_SESSION('GDAI_ELEVATED')`.

---

## Code Examples

### Snowflake External OAuth Security Integration (Snowflake-side DDL)
```sql
-- Source: https://docs.snowflake.com/en/user-guide/oauth-azure
-- Run this in Snowflake once (infrastructure setup)
CREATE SECURITY INTEGRATION gdai_azure_oauth
  TYPE = EXTERNAL_OAUTH
  ENABLED = TRUE
  EXTERNAL_OAUTH_TYPE = AZURE
  EXTERNAL_OAUTH_ISSUER = 'https://login.microsoftonline.com/<TENANT_ID>/v2.0'
  EXTERNAL_OAUTH_JWS_KEYS_URL = 'https://login.microsoftonline.com/<TENANT_ID>/discovery/v2.0/keys'
  EXTERNAL_OAUTH_TOKEN_USER_MAPPING_CLAIM = 'upn'
  EXTERNAL_OAUTH_SNOWFLAKE_USER_MAPPING_ATTRIBUTE = 'login_name'
  EXTERNAL_OAUTH_AUDIENCE_LIST = ('api://<SNOWFLAKE_APP_ID>')
  EXTERNAL_OAUTH_ANY_ROLE_MODE = 'ENABLE';
  -- ANY_ROLE_MODE = ENABLE allows user's default role to be used
  -- without hardcoding role in token scope
```

### Access Token Refresh (next-auth jwt callback)
```typescript
// Source: https://authjs.dev/guides/refresh-token-rotation
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        body: new URLSearchParams({
          client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
          client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
          grant_type: "refresh_token",
          refresh_token: token.refresh_token!,
        }),
      }
    )
    const newTokens = await response.json()
    if (!response.ok) throw newTokens
    return {
      ...token,
      access_token: newTokens.access_token,
      expires_at: Math.floor(Date.now() / 1000 + newTokens.expires_in),
      refresh_token: newTokens.refresh_token ?? token.refresh_token,
    }
  } catch {
    return { ...token, error: "RefreshTokenError" }
  }
}
```

### Role Check Query
```typescript
// Source: https://docs.snowflake.com/en/sql-reference/functions/is_role_in_session
const rows = await querySnowflake(
  conn,
  "SELECT IS_ROLE_IN_SESSION(?) AS IS_ELEVATED",
  [process.env.SNOWFLAKE_ELEVATED_ROLE]
)
// Returns [{ IS_ELEVATED: true }] or [{ IS_ELEVATED: false }]
```

---

## Snowflake External OAuth Setup — Key Facts

This is infrastructure that must exist before any code works:

1. **Azure AD App Registration (Resource):** Register a "Snowflake OAuth Resource" app. Define scopes (e.g., `session:role-any`). Note the Application ID URI.
2. **Azure AD App Registration (Client):** Register the GDAI web app. Add delegated permissions to the resource app. Note the `client_id` and `client_secret`.
3. **Snowflake Security Integration:** `CREATE SECURITY INTEGRATION` with `EXTERNAL_OAUTH_TYPE = AZURE`. Map token `upn` claim to Snowflake `login_name`.
4. **Snowflake User Mapping:** Each user's Snowflake `login_name` must match their Azure AD UPN (e.g., `user@company.com`). This is typically already true in enterprise Snowflake deployments.
5. **Custom Roles:** Create `GDAI_STANDARD` and `GDAI_ELEVATED` roles. Grant appropriate object privileges. Do not use `ACCOUNTADMIN`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-auth v4 GitHub-centric | next-auth v5 / auth.js — framework agnostic, first-class App Router | 2023-2024 | JWT callbacks, middleware, server components all changed |
| Azure AD v1 endpoints | Microsoft Entra ID (v2 endpoints) | 2022+ rebrand | Old `AzureAD` provider deprecated; use `MicrosoftEntraID` |
| next-auth as primary OSS | better-auth absorbed auth.js | Jan 2025 | Auth.js in maintenance mode; better-auth recommended for new projects but not worth migrating for this use case |
| snowflake-sdk CommonJS only | snowflake-sdk with TypeScript types | 2024 | Official `.d.ts` shipped; `@types/snowflake-sdk` still exists as fallback |
| Snowflake password auth per user | External OAuth (Azure AD token pass-through) | ongoing | User's Azure AD token IS the Snowflake credential; no separate Snowflake passwords managed |

**Deprecated/outdated:**
- `next-auth/providers/azure-ad`: Deprecated. Replaced by `next-auth/providers/microsoft-entra-id`.
- Vercel KV adapter in the community package: Not needed for GDAI (JWT strategy replaces it). Remove `@vercel/kv` dependency.

---

## Open Questions

1. **Azure AD Scope for Snowflake**
   - What we know: Snowflake External OAuth requires a scope or audience that the Azure AD token includes; `ANY_ROLE_MODE = ENABLE` removes the need to encode a specific role in the scope.
   - What's unclear: Whether the organization's Azure AD tenant can be configured by the GDAI team, or if this requires IT/AAD admin involvement. The Snowflake OAuth Resource app registration requires tenant-level admin consent.
   - Recommendation: Flag this as an infrastructure dependency for the planning phase. Assume the team has (or can get) Azure AD admin access.

2. **UPN-to-Snowflake login_name mapping**
   - What we know: Snowflake maps `upn` claim → `login_name`. This is the standard mapping for Azure AD.
   - What's unclear: Whether all ~100 users already have Snowflake accounts with matching `login_name = UPN`. If not, user provisioning is required before auth works.
   - Recommendation: Treat user provisioning as an explicit prerequisite. Not in scope for this phase but blocks it.

3. **Token lifetime vs. workflow duration**
   - What we know: Azure AD access tokens expire in ~1 hour. Refresh tokens can extend sessions. next-auth's JWT callback handles rotation.
   - What's unclear: Whether the Snowflake access_token passed to the driver needs to be the same token used for next-auth's session, or if a separate Snowflake-scoped token (with Snowflake audience) is needed. Azure AD issues different access_tokens for different resource audiences.
   - Recommendation: The Snowflake External OAuth token must have the Snowflake application ID as its audience (`aud` claim). The token requested with `scope: "openid profile email offline_access"` targets Microsoft Graph, not Snowflake. A **separate token request** may be needed for Snowflake — using the On-Behalf-Of (OBO) flow or requesting both scopes at once if the Snowflake resource is in the same tenant. This is the most likely integration complexity and must be resolved in planning.

4. **next-auth v5 JWT size limits**
   - What we know: JWT sessions are stored in a cookie (4KB limit). Storing access_token + refresh_token + permissionTier + standard claims is likely fine but may approach the limit.
   - What's unclear: Whether Azure AD tokens are consistently under ~2KB (leaving room for next-auth claims).
   - Recommendation: Test token size empirically. If cookies overflow, switch to server-side session storage (e.g., Redis) or use token introspection and store only the refresh_token.

5. **better-auth vs. next-auth for new development**
   - What we know: next-auth v5 is in tree, functional, and has the Microsoft Entra ID provider. better-auth is actively maintained with a Microsoft provider.
   - What's unclear: Whether to migrate now (before adding Snowflake logic) or stay on next-auth.
   - Recommendation: Stay on next-auth v5 for this phase. The cost of migrating outweighs the benefit for a small, internal tool with a pinned dependency.

---

## Sources

### Primary (HIGH confidence)
- Context7 `/nextauthjs/next-auth` — Microsoft Entra ID provider config, JWT callbacks, session callbacks, middleware, refresh token rotation pattern
- Context7 `/websites/snowflake_en` — snowflake-sdk OAuth authenticator, External OAuth Security Integration DDL, IS_ROLE_IN_SESSION function
- `https://authjs.dev/getting-started/providers/microsoft-entra-id` — Official Auth.js Microsoft Entra ID provider docs
- `https://docs.snowflake.com/en/user-guide/oauth-azure` — Official Snowflake External OAuth Azure AD integration guide
- `https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver-authenticate` — Official snowflake-sdk authentication options
- `https://docs.snowflake.com/en/sql-reference/functions/is_role_in_session` — IS_ROLE_IN_SESSION function reference

### Secondary (MEDIUM confidence)
- Context7 `/better-auth/better-auth` — better-auth Microsoft provider (alternative consideration)
- `https://docs.snowflake.com/en/user-guide/oauth-ext-overview` — External OAuth overview (scope requirements, failure codes)
- Hacker News / GitHub discussions — Auth.js merger into better-auth, maintainer departure (Jan 2025)

### Tertiary (LOW confidence)
- WebSearch: workflow state preservation patterns before SSO redirect — no authoritative source found; sessionStorage pattern is community consensus only
- WebSearch: Snowflake OBO (on-behalf-of) token flow for Node.js — not definitively confirmed; flagged as Open Question 3

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified in Context7 and official docs; packages already in tree
- Architecture: MEDIUM — Next.js + next-auth pattern is solid; OBO token flow for Snowflake is uncertain (Open Question 3)
- Pitfalls: HIGH — most from official Snowflake error codes and documented limitations
- Permission tier resolution: HIGH — IS_ROLE_IN_SESSION verified against official docs

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days) — auth.js v5 beta and snowflake-sdk TypeScript types are stable areas; re-check if next-auth releases a breaking beta or better-auth changes Microsoft provider API
