# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Non-technical healthcare ops staff can ask a business question, get a validated answer from live Snowflake data, and advance to the next question — without writing SQL or involving a data analyst.
**Current focus:** Phase 1 — Auth + Session

## Current Position

Phase: 1 of 6 (Auth + Session)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-02-19 — Completed 01-02-PLAN.md (Snowflake OAuth session scoping + permission tier)

Progress: [██░░░░░░░░] 20% (2 of ~10 total plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 4 min
- Total execution time: 7 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-auth-session | 2/3 done | 7 min | 3.5 min |

**Recent Trend:**
- Last 5 plans: 5 min, 2 min
- Trend: Fast

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Snowflake sessions scoped to user credentials — Snowflake RLS is authoritative access control
- [Init]: No result data in S3 artifacts — PHI risk; re-run required to see results
- [Init]: Constitution (Claude system prompt) is a separate deliverable — must be provided before SSA implementation begins
- [Init]: Permission tier from Snowflake role, not SSO groups — avoids maintaining a separate elevated-access group
- [01-01]: Use azure-ad provider (not microsoft-entra-id) — next-auth@5.0.0-beta.3 only ships azure-ad; the names are synonymous
- [01-01]: JWT augmentation in @auth/core/jwt — next-auth/jwt is empty in beta.3; @auth/core/jwt is the real interface
- [01-01]: @vercel/kv retained — templates.ts/users.ts still use it; removal deferred to when those modules are replaced
- [01-01]: session.user.id populated from token.sub — preserves legacy API route type compatibility without rewriting unrelated routes
- [01-02]: No Snowflake connection pooling — per-request connections required for user-scoped RLS
- [01-02]: resolvePermissionTier fails closed to "standard" — Snowflake unavailability cannot block login
- [01-02]: Permission tier cached in JWT at login — not re-evaluated per-request
- [01-02]: SNOWFLAKE_ELEVATED_ROLE env var (default: GDAI_ELEVATED) makes elevated role configurable

### Pending Todos

None yet.

### Blockers/Concerns

- Azure AD app registration and env vars (AUTH_MICROSOFT_ENTRA_ID_ID, AUTH_MICROSOFT_ENTRA_ID_SECRET, AUTH_MICROSOFT_ENTRA_ID_ISSUER, AUTH_SECRET) must be configured before any runtime testing of auth flow.
- Azure AD app registration must include Snowflake as an authorized resource (or OBO flow configured) before OAuth token can authenticate to Snowflake. See 01-RESEARCH.md Open Question 3.
- Constitution (Claude system prompt) must be authored and provided before Phase 2 implementation begins. It governs tone, domain boundaries, escalation behavior, certainty language, and jailbreak handling. Not a coding deliverable.
- Development Snowflake environment with representative, de-identified data must be configured before Phase 2 can be verified.
- 9 pre-existing TypeScript errors in community package (version route, adapter.ts, templates.ts) — unrelated to auth work, deferred.

## Session Continuity

Last session: 2026-02-19T09:15:26Z
Stopped at: Completed 01-02-PLAN.md. Next: 01-03 (token refresh logic).
Resume file: None
