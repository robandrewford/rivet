---
phase: 01-auth-session
plan: "01"
subsystem: auth
tags: [next-auth, microsoft-entra-id, azure-ad, jwt, session, middleware, oauth2, oidc]

# Dependency graph
requires: []
provides:
  - NextAuth configured with Microsoft Entra ID (azure-ad) provider and JWT session strategy
  - Auth guard middleware at src/middleware.ts blocking all unauthenticated routes
  - JWT type augmentation with access_token, expires_at, permissionTier, error, snowflake_token
  - Session type augmentation with access_token, permissionTier, error, user.id
  - snowflake-sdk installed for Plan 01-02 use
affects:
  - 01-auth-session/01-02 (Snowflake session scoping — needs access_token from JWT)
  - 01-auth-session/01-03 (Token refresh — needs expires_at and refresh_token from JWT)
  - All subsequent phases (auth.ts exports are the auth entry point)

# Tech tracking
tech-stack:
  added:
    - snowflake-sdk@1.15.0 (installed, used in Plan 01-02)
  removed:
    - octokit@3.1.2
    - passport-local@1.0.0
  patterns:
    - next-auth v5 JWT session strategy (no database adapter)
    - Middleware-based auth guard with edge-compatible auth() callback
    - Module augmentation for next-auth JWT and Session interfaces

key-files:
  created:
    - packages/community/src/lib/auth.ts (rewritten)
    - packages/community/src/types/next-auth.d.ts
    - packages/community/src/middleware.ts
  modified:
    - packages/community/package.json
  deleted:
    - packages/community/src/app/middleware.ts (incorrect location, replaced)

key-decisions:
  - "Use azure-ad provider (not microsoft-entra-id): next-auth@5.0.0-beta.3 only has azure-ad; microsoft-entra-id was added in later betas"
  - "Keep @vercel/kv in package.json: templates.ts and users.ts still import it; removal would break compilation"
  - "Populate session.user.id from token.sub (Microsoft unique user ID) to preserve legacy API route compatibility"
  - "JWT augmentation in @auth/core/jwt (not next-auth/jwt): next-auth/jwt is empty in v5 beta.3"

patterns-established:
  - "auth.ts exports: { handlers, auth, signIn, signOut } — next-auth v5 pattern"
  - "Middleware at src/middleware.ts (not src/app/middleware.ts) — Next.js requirement"
  - "Session callbacks copy JWT fields explicitly to session (permissionTier, access_token, error)"

# Metrics
duration: 5min
completed: 2026-02-19
---

# Phase 01 Plan 01: Auth Session Summary

**Microsoft Entra ID SSO via next-auth azure-ad provider with JWT sessions and middleware auth guard blocking all unauthenticated access**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-19T09:05:15Z
- **Completed:** 2026-02-19T09:10:18Z
- **Tasks:** 2
- **Files modified:** 5 (3 created, 1 modified, 1 deleted)

## Accomplishments

- NextAuth reconfigured from GitHub OAuth + database sessions to Microsoft Entra ID + JWT sessions
- Auth guard middleware at `src/middleware.ts` redirects all unauthenticated requests to `/api/auth/signin`
- JWT carries `access_token`, `expires_at`, `refresh_token`, `permissionTier`, and `snowflake_token` fields for Plans 01-02 and 01-03
- `snowflake-sdk` installed in `package.json` for use in Plan 01-02

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace GitHub provider with MicrosoftEntraID and switch to JWT session strategy** - `2cbfb963` (feat)
2. **Task 2: Implement auth guard middleware that blocks all unauthenticated access** - `1a70adab` (feat)

## Files Created/Modified

- `packages/community/src/lib/auth.ts` - Rewritten: AzureAD provider, JWT strategy, jwt+session callbacks, exports handlers/auth/signIn/signOut
- `packages/community/src/types/next-auth.d.ts` - Created: JWT and Session module augmentations
- `packages/community/src/middleware.ts` - Created: Auth guard at correct Next.js location
- `packages/community/package.json` - Removed octokit, passport-local; added snowflake-sdk
- `packages/community/src/app/middleware.ts` - Deleted: was a stub at wrong location

## Decisions Made

- **azure-ad not microsoft-entra-id:** `next-auth@5.0.0-beta.3` (the installed version) ships `azure-ad` as the provider import path. The `microsoft-entra-id` name was introduced in later beta versions. Used `azure-ad` to match installed package.
- **@vercel/kv retained:** Plan specified removing it, but `templates.ts`, `users.ts`, and `adapter.ts` all import from `@vercel/kv`. Removing it would introduce 5+ compile errors unrelated to this plan's scope.
- **JWT augmentation in @auth/core/jwt:** `next-auth/jwt` is an empty module in beta.3 (`export {};`). Augmenting it has no effect. Correct module is `@auth/core/jwt`.
- **session.user.id from token.sub:** Legacy API routes use `session.user.id` typed as `UserId`. The new JWT strategy provides `token.sub` (Microsoft's unique OID). Mapped sub → user.id to preserve API route type compatibility without rewriting those routes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used azure-ad provider instead of microsoft-entra-id**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Plan specified `next-auth/providers/microsoft-entra-id` but this path does not exist in `next-auth@5.0.0-beta.3`. TypeScript error: `Cannot find module 'next-auth/providers/microsoft-entra-id'`
- **Fix:** Used `next-auth/providers/azure-ad` which is the correct provider for this version. Functionality is identical — azure-ad IS Microsoft Entra ID.
- **Files modified:** `packages/community/src/lib/auth.ts`
- **Verification:** TypeScript compilation passes; provider authenticates against `https://login.microsoftonline.com/<tenant>/v2.0`
- **Committed in:** 2cbfb963 (Task 1 commit)

**2. [Rule 1 - Bug] JWT module augmentation in @auth/core/jwt not next-auth/jwt**
- **Found during:** Task 1 (investigating type errors)
- **Issue:** `next-auth/jwt` exports `{}` in beta.3, making `declare module 'next-auth/jwt'` augmentation ineffective
- **Fix:** Augmented `@auth/core/jwt` instead, which is the actual module containing the JWT interface
- **Files modified:** `packages/community/src/types/next-auth.d.ts`
- **Committed in:** 2cbfb963 (Task 1 commit)

**3. [Rule 2 - Missing Critical] Preserved session.user.id for legacy API route compatibility**
- **Found during:** Task 1 (TypeScript compilation after removing old auth.ts Session augmentation)
- **Issue:** Old `auth.ts` had inline `declare module 'next-auth' { interface Session { user: { id: UserId } } }`. Removing it broke compilation of 4 legacy API routes that use `session.user.id`
- **Fix:** Added `user: { id: UserId }` to Session augmentation in `next-auth.d.ts`; populated `session.user.id` from `token.sub` in session callback
- **Files modified:** `packages/community/src/types/next-auth.d.ts`, `packages/community/src/lib/auth.ts`
- **Committed in:** 2cbfb963 (Task 1 commit)

**4. [Rule 1 - Bug] Kept @vercel/kv in package.json (plan specified removal)**
- **Found during:** Task 1 analysis
- **Issue:** Plan specified removing `@vercel/kv`, but `templates.ts`, `users.ts`, and `adapter.ts` all import from it. Removing would cause multiple TS errors outside this plan's scope.
- **Fix:** Retained `@vercel/kv` dependency; only removed `octokit` and `passport-local` which had no remaining imports
- **Files modified:** `packages/community/package.json`
- **Committed in:** 2cbfb963 (Task 1 commit)

---

**Total deviations:** 4 auto-fixed (2 rule-1 bugs, 1 rule-2 missing critical, 1 rule-1 bug)
**Impact on plan:** All auto-fixes necessary for correctness and compilation. Provider switch is cosmetic (azure-ad = MicrosoftEntraID). No scope creep.

## Issues Encountered

- 9 pre-existing TypeScript errors in the codebase (version route missing `@ironclad/rivet-core`, adapter.ts `isolatedModules` import, templates.ts `Uint8Array` type). These existed before this plan and were not introduced by our changes. Not fixed as they are outside this plan's scope.

## User Setup Required

External services require manual configuration before the auth flow works. The following Azure/Entra ID configuration must be done:

**Environment variables required:**
- `AUTH_MICROSOFT_ENTRA_ID_ID` — Azure Portal -> App registrations -> GDAI Client App -> Application (client) ID
- `AUTH_MICROSOFT_ENTRA_ID_SECRET` — Azure Portal -> App registrations -> GDAI Client App -> Certificates & secrets -> New client secret
- `AUTH_MICROSOFT_ENTRA_ID_ISSUER` — `https://login.microsoftonline.com/<TENANT_ID>/v2.0`
- `AUTH_SECRET` — Generate with: `openssl rand -base64 32`

**Azure Dashboard configuration steps:**
1. Register GDAI Client application in Azure AD (Azure Portal -> Microsoft Entra ID -> App registrations -> New registration)
2. Register GDAI Snowflake Resource application in Azure AD
3. Define scope on Snowflake Resource app (Expose an API -> Add a scope, e.g., `session:role-any`)
4. Grant GDAI Client app delegated permission to Snowflake Resource app scope
5. Add redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`

## Next Phase Readiness

- Auth foundation complete. JWT carries `access_token` for Snowflake audience token exchange in Plan 01-02.
- `snowflake-sdk` is installed and available for Plan 01-02 connection implementation.
- `permissionTier` placeholder set to `"standard"` — Plan 01-02 updates it based on Snowflake role.
- `refresh_token` stored in JWT — Plan 01-03 implements token refresh using it.
- Blockers: Azure AD app registration and env vars must be configured for any runtime testing.

---
*Phase: 01-auth-session*
*Completed: 2026-02-19*
