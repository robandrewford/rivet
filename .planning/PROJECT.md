# GDAI — Guided Data Analysis Interface

## What This Is

GDAI is a guided data analysis interface that enables non-technical healthcare operations staff (~100 users) to conduct structured, multi-step data analysis against live Snowflake data without writing SQL. Built on a forked Rivet codebase, it uses Claude as an AI collaborator to translate business questions into executable queries, evaluate results, and guide users iteratively through a defined analytical framework. It exists to eliminate the bottleneck between business users who own the questions and data analysts who currently own the tools.

## Core Value

Non-technical healthcare ops staff can ask a business question, get a validated answer from live Snowflake data, and advance to the next question — without writing SQL or involving a data analyst.

## Requirements

### Validated

<!-- What the Rivet fork already provides — these capabilities exist and are relied upon. -->

- ✓ DAG canvas and graph execution engine — existing (rivet-core)
- ✓ 86+ built-in node types (LLM calls, data transformation, control flow, HTTP, etc.) — existing
- ✓ Plugin/node registry system for adding custom node types — existing
- ✓ React UI with visual graph editor, Monaco code editor, drag-and-drop canvas — existing
- ✓ Event-driven execution lifecycle (nodeStart, nodeFinish, graphStart, graphFinish, etc.) — existing
- ✓ TypeScript monorepo (packages/core, packages/app, packages/node, packages/cli) — existing
- ✓ Streaming output support and partial result handling — existing
- ✓ p-queue-based concurrent node execution within dependency constraints — existing

### Active

<!-- Net-new capabilities being built for GDAI v1. -->

<!-- Authentication & Access -->
- [ ] Microsoft SSO authentication (OAuth/OIDC) with no application UI until auth succeeds
- [ ] SSO group membership → permission tier mapping (standard vs. elevated)
- [ ] Snowflake session scoped to authenticated user credentials, established at login
- [ ] Session state preservation on SSO expiry (no data loss, re-auth prompt)

<!-- Single-Shot Analysis (SSA) Node -->
- [ ] SSA node type: clarification loop (chat interface embedded in node on DAG canvas)
- [ ] Haiku routing call at SSA step start to classify complexity and select working model tier
- [ ] Model tier logic: Haiku (simple/current-state), Sonnet (standard SQL/eval/narrative), Opus (causal/synthesis/escalation)
- [ ] Explicit research question confirmation before SQL generation
- [ ] Claude-generated SELECT-only SQL with editable SQL review step
- [ ] Labeled progress phases: Refining → Generating query → Running query → Reviewing results
- [ ] Claude result evaluation: correct/incorrect/failed before user sees output
- [ ] Plain-English result narrative (calibrated by constitution)
- [ ] Pre-populated next-question recommendation for following SSA node
- [ ] "Revised" state: Claude surfaces why result doesn't answer the question, recommends alternative
- [ ] "Failed" state: Claude intercepts Snowflake errors, translates to plain English, never shows raw errors
- [ ] Jailbreak/out-of-scope detection: polite decline, escalation recommendation on repeat

<!-- Multi-Shot Analysis (MSA) / DAG -->
- [ ] MSA DAG: each accepted result appends a new SSA node connected to prior
- [ ] DAG branching: Claude proposes two parallel hypotheses, user accepts, concurrent SSA execution
- [ ] Branch synthesis: Opus-class merge node when both parallel branches reach Complete
- [ ] Branch-from-prior: user can fork from any prior DAG node
- [ ] Branch pruning: archive (not delete) pruned branches in artifact

<!-- Analysis Framework Navigation -->
- [ ] V1 analysis steps: 1 (What happened?), 2 (Why did this happen?), 3 (What is happening now?)
- [ ] Navigation UI structured to accommodate steps 4–6 as future additions without rework
- [ ] Steps 4–6 not accessible, triggerable, or referenced in V1 interface

<!-- End-User Palette -->
- [ ] Filtered node palette: end users see only GDAI node types (SSA, branch, merge, synthesis)
- [ ] All ~40 Rivet built-in node types remain in codebase, available to elevated users / workflow authors

<!-- Save, Share, Fork, Diff -->
- [ ] MSA artifact save to S3 (us-east-1): full DAG structure, confirmed questions, SQL as executed (user edits flagged), Claude narratives, node states, model tiers, metadata — no result data
- [ ] ACL-based sharing: any authenticated org user can view and re-run shared workflows
- [ ] Standard user: cannot download artifact JSON locally
- [ ] Elevated user: can download artifact JSON locally
- [ ] Workflow fork: new independent artifact owned by forking user
- [ ] Re-run: all SSA nodes execute against current user's Snowflake session and live data
- [ ] MSA artifact diff: structural comparison (nodes added/removed/modified, SQL changes, question changes — no result data)

<!-- Schema Drift Detection -->
- [ ] Pre-run schema check against all SSA nodes before executing any SQL
- [ ] Schema drift: block execution entirely, plain-English user message identifying missing dependency
- [ ] Schema drift: fire structured webhook alert to data engineering team (workflow ID, node ID, missing table/column, deep link)
- [ ] No substitution, no partial execution, no artifact modification on drift

<!-- Escalation -->
- [ ] Slack escalation to #data-analytics-support: user name, refined question, SQL, Claude summary, deep link
- [ ] Escalation only after user saves workflow and explicitly confirms
- [ ] Deep link format: {APP_BASE_URL}/workflows/{workflow_id}

<!-- Audit Logging -->
- [ ] Append-only audit log: timestamp, user identity, workflow ID, node ID, state transition, model tier, token counts, Snowflake query ID, escalation events, schema drift events
- [ ] Audit logs not surfaced to end users

<!-- Reproducibility -->
- [ ] Claude non-determinism must not affect SQL construction or result structure
- [ ] Narrative phrasing may vary; factual content derived from result must not

### Out of Scope

- Steps 4 (forecasting), 5 (goal-setting), 6 (prescriptive analytics) — deferred to v2+; navigation UI must accommodate without structural rework
- External sharing (outside the organization) — RPM billing and patient engagement data is operationally sensitive
- Sigma integration — coexist as separate tools; no result push, no Sigma access from within GDAI
- Automatic escalation — escalation is always user-initiated; Claude recommends, user decides
- Snowflake result data in artifacts — PHI consideration; re-run is required to see results
- Application-layer data access control — Snowflake row/column-level security is authoritative; duplicating it creates maintainability risk and false security
- Second runtime language — TypeScript/Node only; no new language without explicit approval
- Privileged Snowflake service account — all queries execute under the authenticated user's existing permissions
- Non-SELECT SQL execution — INSERT, UPDATE, DELETE, CREATE, DROP, TRUNCATE, MERGE are never executed
- Raw Snowflake errors to users — Claude always intercepts and translates
- Automatic MSA execution retry on Snowflake unavailability — surface clear error, preserve state, don't retry

## Context

- **Codebase foundation**: Forked Rivet (TypeScript monorepo). DAG engine, node registry, React canvas, execution lifecycle, and all 86+ built-in nodes are preserved. GDAI adds a new SSA node type and supporting structural types (branch, merge, synthesis) via the plugin architecture.
- **User population**: ~100 healthcare operations staff (care managers, nursing team leads). Non-technical. The system replaces their current path: ask a question → wait for analyst → get answer → ask next question.
- **Healthcare context**: Data may contain PHI. Snowflake row/column-level security is the access control boundary. The application must not duplicate it or attempt to bypass it.
- **Analytical framework**: Three-step structure aligned to clinical operations workflows. Steps 1–3 cover historical trends, causal analysis, and current-state reporting. Steps 4–6 (forecasting, goal-setting, prescriptive) are future.
- **The constitution**: Claude's system prompt governing tone, domain boundaries, escalation behavior, certainty language, and jailbreak handling is a separate deliverable. It must be authored by a domain expert before implementation begins. It is not generated by the coding agent.
- **Concurrency target**: Up to 70 simultaneous active users.
- **Response envelope**: Each SSA step (clarification through result surfaced) must complete within approximately 60 seconds under normal Snowflake and Claude API conditions.
- **Development environment**: Designated Snowflake development environment with representative, de-identified data. Never point development at production.

## Constraints

- **Tech stack**: TypeScript/Node. No second runtime language without explicit approval. Forked from Rivet — must preserve existing graph engine and node system.
- **Database**: Snowflake, SELECT-only. User-credential-scoped sessions. Max result set: 5 million rows.
- **Auth**: Microsoft SSO (OAuth/OIDC). No local fallback.
- **LLM**: Claude API only. Three tiers: Haiku/Sonnet/Opus. No other LLM provider.
- **Storage**: AWS S3 us-east-1. No result data stored. ACLs enforced at S3 layer.
- **Audit**: Append-only. Every state transition, model selection, token count, query ID, escalation, and drift event logged.
- **Security**: READ-ONLY. SELECT-only SQL enforced. No data modification possible.
- **PHI**: Healthcare data — must not store result data in artifacts, must not share outside org, must not bypass Snowflake security.
- **Concurrency**: 70 simultaneous active users.
- **Response time**: ~60 seconds per SSA step end-to-end.
- **Constitution dependency**: Claude system prompt must be authored and provided before implementation begins. Not a coding deliverable.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork Rivet rather than build DAG UI from scratch | DAG canvas + execution engine + node registry are directly reusable; avoid rebuilding infrastructure that already exists | — Pending |
| Snowflake sessions scoped to user credentials (no service account) | Snowflake RLS is authoritative access control; privileged service account would create false security boundary | — Pending |
| No result data in S3 artifacts | PHI risk; user's Snowflake security context is the correct access control mechanism — re-running is required | — Pending |
| Claude evaluates result before user sees it | Unchecked results presented as answers is the primary failure mode this system is designed to prevent | — Pending |
| Escalation is always user-initiated | The decision to involve an analyst belongs to the user, not the system | — Pending |
| Schema drift blocks entire MSA execution | Silent execution against changed schema produces wrong results with no indication to user | — Pending |
| Constitution as separate deliverable | Tone, domain boundaries, and jailbreak handling require domain expertise; must not be generated by coding agent | — Pending |
| V1 scope: steps 1–3 only | Ship core analytical value first; forecasting and goal-setting require additional domain validation | — Pending |

---
*Last updated: 2026-02-18 after initialization from SPEC.md v2.0*
