# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Non-technical healthcare ops staff can ask a business question, get a validated answer from live Snowflake data, and advance to the next question — without writing SQL or involving a data analyst.
**Current focus:** Phase 1 — Auth + Session

## Current Position

Phase: 1 of 6 (Auth + Session)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-19 — Completed 01-01-PLAN.md (Microsoft Entra ID SSO + JWT middleware)

Progress: [█░░░░░░░░░] 10% (1 of ~10 total plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 5 min
- Total execution time: 5 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-auth-session | 1/3 done | 5 min | 5 min |

**Recent Trend:**
- Last 5 plans: 5 min
- Trend: —

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

### Pending Todos

None yet.

### Blockers/Concerns

- Azure AD app registration and env vars (AUTH_MICROSOFT_ENTRA_ID_ID, AUTH_MICROSOFT_ENTRA_ID_SECRET, AUTH_MICROSOFT_ENTRA_ID_ISSUER, AUTH_SECRET) must be configured before any runtime testing of auth flow.
- Constitution (Claude system prompt) must be authored and provided before Phase 2 implementation begins. It governs tone, domain boundaries, escalation behavior, certainty language, and jailbreak handling. Not a coding deliverable.
- Development Snowflake environment with representative, de-identified data must be configured before Phase 2 can be verified.
- 9 pre-existing TypeScript errors in community package (version route, adapter.ts, templates.ts) — unrelated to auth work, deferred.

## Session Continuity

Last session: 2026-02-19T09:10:18Z
Stopped at: Completed 01-01-PLAN.md. Next: 01-02 (Snowflake session scoping).
Resume file: None
