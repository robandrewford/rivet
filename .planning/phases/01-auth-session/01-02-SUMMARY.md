---
phase: 01-auth-session
plan: "02"
subsystem: auth
tags: [snowflake, oauth, jwt, permissions, next-auth, azure-ad]

# Dependency graph
requires:
  - phase: 01-auth-session/01-01
    provides: NextAuth with azure-ad provider, JWT session shape, snowflake-sdk installed
provides:
  - Per-request Snowflake connection factory using OAuth token pass-through
  - Permission tier resolution (standard/elevated) from IS_ROLE_IN_SESSION
  - JWT callback wired to resolve and cache permission tier at login time
  - Dynamic OAuth scope including SNOWFLAKE_OAUTH_SCOPE
affects: [02-query-execution, 03-rag, 04-conversation, all phases using Snowflake connections]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-request Snowflake connections (no pooling) — each request creates/destroys its own connection"
    - "Fail-closed permission resolution — any error returns 'standard', never throws"
    - "Permission tier cached in JWT — no per-request Snowflake call for authorization"
    - "IS_ROLE_IN_SESSION role names always uppercased (case-sensitive function)"

key-files:
  created:
    - packages/community/src/lib/snowflake.ts
    - packages/community/src/lib/permissions.ts
  modified:
    - packages/community/src/lib/auth.ts

key-decisions:
  - "No connection pooling — Snowflake connections are per-request, scoped to user's OAuth token"
  - "resolvePermissionTier fails closed to 'standard' on any error — never throws, never blocks login"
  - "Permission tier cached in JWT at initial sign-in, not re-checked on subsequent requests"
  - "SNOWFLAKE_ELEVATED_ROLE env var (default: GDAI_ELEVATED) determines the elevated role"
  - "SNOWFLAKE_OAUTH_SCOPE dynamically added to authorization scope via filter/join"

patterns-established:
  - "snowflake.ts: createUserConnection / querySnowflake / destroyConnection as the low-level primitives"
  - "permissions.ts: try/catch/finally wrapping Snowflake calls for safe tier resolution"

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 1 Plan 02: Snowflake OAuth Session Scoping Summary

**Per-request Snowflake connections with OAuth token pass-through; permission tier resolved from IS_ROLE_IN_SESSION and cached in JWT at login**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-19T09:14:06Z
- **Completed:** 2026-02-19T09:15:26Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Snowflake connection factory (`createUserConnection`) using `authenticator: OAUTH` — no pooling, per-request
- Permission tier resolver (`resolvePermissionTier`) queries `IS_ROLE_IN_SESSION` with the user's own token
- NextAuth JWT callback now resolves and caches permission tier at login; `SNOWFLAKE_OAUTH_SCOPE` dynamically included in OAuth scope

## Task Commits

Each task was committed atomically:

1. **Task 1: Snowflake per-request connection factory** - `7976c937` (feat)
2. **Task 2: Permission tier resolution + auth.ts wiring** - `a6961e14` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/community/src/lib/snowflake.ts` - createUserConnection (OAuth), querySnowflake, destroyConnection
- `packages/community/src/lib/permissions.ts` - resolvePermissionTier using IS_ROLE_IN_SESSION, fails closed
- `packages/community/src/lib/auth.ts` - imports resolvePermissionTier, replaces placeholder tier, adds dynamic scope

## Decisions Made

- No connection pooling: Snowflake sessions must be user-scoped for RLS to function correctly. Pooling would mix credentials.
- Fail closed: `resolvePermissionTier` wraps all Snowflake operations in try/catch/finally and returns "standard" on any error. Login cannot be blocked by Snowflake unavailability.
- Permission tier cached in JWT: determined once at login, not re-evaluated on each request. Refresh logic (Plan 01-03) will re-resolve if needed.
- `SNOWFLAKE_ELEVATED_ROLE` env var (default: `GDAI_ELEVATED`) makes the elevated role configurable without code changes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compilation confirmed clean for all three files. Pre-existing errors (9 errors in version route, adapter.ts, templates.ts) remain unchanged.

## User Setup Required

None - no new external service configuration required. Existing env var list from 01-01 covers Snowflake (`SNOWFLAKE_ACCOUNT`) and the new optional `SNOWFLAKE_ELEVATED_ROLE` and `SNOWFLAKE_OAUTH_SCOPE`.

New optional env vars:
- `SNOWFLAKE_ELEVATED_ROLE` — Snowflake role name that grants elevated tier (default: `GDAI_ELEVATED`)
- `SNOWFLAKE_OAUTH_SCOPE` — OAuth scope targeting Snowflake (e.g., `session:role:GDAI_APP`); added to Azure AD authorization request if set

## Next Phase Readiness

- Snowflake connection primitives ready for use in query execution (Phase 2)
- Permission tier in JWT session ready for route-level authorization checks
- Blocker: Azure AD app registration must include Snowflake as an authorized resource (or OBO flow configured) before OAuth token can authenticate to Snowflake. See 01-RESEARCH.md Open Question 3.
- Plan 01-03 (token refresh) is the remaining auth phase task.

---
*Phase: 01-auth-session*
*Completed: 2026-02-19*
