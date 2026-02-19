# Roadmap: GDAI — Guided Data Analysis Interface

## Overview

GDAI transforms a forked Rivet codebase into a guided data analysis tool for non-technical healthcare ops staff. The journey begins with locking down authentication and Snowflake session establishment, progresses through building the SSA node as a complete end-to-end analysis unit, extends that into multi-step DAG workflows, then layers in persistence/sharing, and finishes with schema drift detection, Slack escalation, and audit logging that make the system safe for production use.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Auth + Session** - Enforce Microsoft SSO, establish Snowflake session, determine permission tier
- [ ] **Phase 2: SSA Core** - Single-shot analysis node working end-to-end: clarification through validated result
- [ ] **Phase 3: SSA Polish + UI Shell** - Failure/revision states, escalation recommendation, jailbreak handling, framework navigation, palette filtering
- [ ] **Phase 4: MSA / DAG** - Multi-step analysis: node chaining, branching, parallel execution, merge synthesis
- [ ] **Phase 5: Persistence + Sharing** - S3 artifact save/load, sharing, forking, re-run, diff, download permissions
- [ ] **Phase 6: Safety + Observability** - Schema drift detection, Slack escalation, append-only audit logging

## Phase Details

### Phase 1: Auth + Session
**Goal**: Users can only access the application via Microsoft SSO, their Snowflake session is scoped to their own credentials, and their permission tier is determined
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04 (AUTH-05, AUTH-06 deferred to Phase 5 where the download UI exists)
**Success Criteria** (what must be TRUE):
  1. Navigating to the application redirects to Microsoft SSO; no application UI renders until authentication completes
  2. After login, the system resolves the user's permission tier (standard or elevated) from their Snowflake role and caches it in session.permissionTier
  3. All subsequent Snowflake queries execute under the authenticated user's own credentials, not a service account
  4. When SSO session expires mid-workflow, the user is prompted to re-authenticate and returns to their exact prior URL (full workflow state restoration deferred to Phase 2+ when workflow UI exists)
**Plans:** 3 plans in 3 waves (sequential)

Plans:
- [ ] 01-01-PLAN.md — Microsoft SSO integration: MicrosoftEntraID provider, JWT session strategy, auth guard middleware (Wave 1)
- [ ] 01-02-PLAN.md — Snowflake session + permission tier: OAuth connection factory, IS_ROLE_IN_SESSION resolution, JWT caching (Wave 2)
- [ ] 01-03-PLAN.md — Token refresh + state preservation: refresh rotation, session watchdog, sessionStorage checkpoint/restore (Wave 3)

### Phase 2: SSA Core
**Goal**: A single SSA node can carry a user from a business question through clarification, SQL generation, Snowflake execution, Claude evaluation, and a validated result — end-to-end
**Depends on**: Phase 1
**Requirements**: SSA-01, SSA-02, SSA-03, SSA-04, SSA-05, SSA-07, SSA-08, SSA-09, SSA-10, SSA-11, SSA-12, SSA-13
**Success Criteria** (what must be TRUE):
  1. The SSA node type is registered in the Rivet node registry and appears on the DAG canvas
  2. A user can enter a business question, iterate through a clarification chat embedded in the node, and confirm a research question before SQL is generated
  3. The system selects the correct Claude model tier (Haiku/Sonnet/Opus) via a routing call before beginning work
  4. Claude generates SELECT-only SQL; the user can view it in an editable editor and accept, edit, or discard it
  5. When the result correctly answers the confirmed question, the node reaches Complete state with a plain-English narrative and a pre-populated follow-up question recommendation
**Plans**: TBD

Plans:
- [ ] 02-01: SSA node type registration and state machine (Rivet plugin architecture)
- [ ] 02-02: Clarification loop chat interface embedded in canvas node
- [ ] 02-03: Haiku routing call and model tier selection logic
- [ ] 02-04: Research question confirmation and Claude SQL generation
- [ ] 02-05: Snowflake query execution and Claude result evaluation
- [ ] 02-06: Complete state: result view, narrative, next-question recommendation

### Phase 3: SSA Polish + UI Shell
**Goal**: The SSA node handles all edge cases (failure, revision, escalation, jailbreak), the framework navigation presents the three analysis steps, and the node palette is filtered by user tier
**Depends on**: Phase 2
**Requirements**: SSA-06, SSA-14, SSA-15, SSA-16, SSA-17, SSA-18, FRAMEWORK-01, FRAMEWORK-02, FRAMEWORK-03, FRAMEWORK-04, PALETTE-01, PALETTE-02, PALETTE-03
**Success Criteria** (what must be TRUE):
  1. When Claude's evaluation finds the result does not answer the question, the node enters Revised state — raw result is not shown, Claude explains the gap and recommends an alternative
  2. When Snowflake returns an error, Claude intercepts it and presents a plain-English explanation; the node enters Failed state and raw error is never displayed to the user
  3. After approximately 4–5 unresolved clarification exchanges, Claude recommends escalation and explains what it could not resolve
  4. Out-of-scope or jailbreak attempts receive a polite decline; repeated attempts surface an escalation recommendation; attempts are logged
  5. The navigation UI presents steps 1, 2, and 3 with slots for 4–6 that are visible but inaccessible, and each step's clarification loop is contextualized with prior step results
  6. Standard users see only GDAI node types in the palette; elevated users see all Rivet built-in nodes
**Plans**: TBD

Plans:
- [ ] 03-01: Revised and Failed SSA states with Claude error interception
- [ ] 03-02: Escalation recommendation after clarification exhaustion and jailbreak detection
- [ ] 03-03: Analysis framework navigation UI (steps 1–3 active, 4–6 placeholder slots)
- [ ] 03-04: Node palette filtering by permission tier

### Phase 4: MSA / DAG
**Goal**: Users can build multi-step analysis chains, fork into parallel branches, synthesize findings from converging branches, and archive branches they no longer need
**Depends on**: Phase 3
**Requirements**: MSA-01, MSA-02, MSA-03, MSA-04, MSA-05, MSA-06, MSA-07, MSA-08, MSA-09, MSA-10
**Success Criteria** (what must be TRUE):
  1. Accepting a Complete SSA result appends a new connected SSA node with Claude's recommended follow-up pre-populated in the clarification loop
  2. Claude can propose a branching hypothesis; the user accepts or declines; accepting creates two parallel SSA nodes that execute concurrently
  3. When both parallel branches reach Complete, a merge option appears; accepting produces an Opus-generated narrative attributing findings to each branch, connected in the DAG
  4. A user can branch from any prior completed node to start an alternative investigation path without touching the existing path
  5. A user can prune a branch; the branch is archived in the artifact and remains recoverable
**Plans**: TBD

Plans:
- [ ] 04-01: Sequential SSA node chaining with pre-populated follow-up
- [ ] 04-02: Branch proposal, user accept/decline, and parallel SSA execution
- [ ] 04-03: Branch merge detection, Opus synthesis node, and DAG merge connection
- [ ] 04-04: Branch-from-prior and branch pruning / archive

### Phase 5: Persistence + Sharing
**Goal**: Users can save MSA workflows to S3, share them with any authenticated colleague, fork them, re-run them against live data, compare versions, and download artifacts based on their permission tier
**Depends on**: Phase 4
**Requirements**: STORAGE-01, STORAGE-02, STORAGE-03, STORAGE-04, STORAGE-05, STORAGE-06, STORAGE-07, REPRO-01, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. Saving an MSA writes a JSON artifact to S3 containing the full DAG structure, confirmed questions, SQL as executed (user edits flagged), Claude narratives, node states, model tiers, and artifact metadata — no result data
  2. Any authenticated org user can open a shared workflow link, view the DAG, and re-run it against their own Snowflake session and current live data
  3. Forking creates a new independent artifact owned by the forking user; changes to the fork do not affect the original
  4. Two executions of the same artifact under identical Snowflake state produce identical SQL and result structure; narrative phrasing may vary
  5. The diff view shows structural changes between artifact versions (nodes added/removed/modified, SQL changes, question changes) with no result data
  6. Elevated users (session.permissionTier === "elevated") can download artifact JSON; standard users cannot (AUTH-05/AUTH-06 enforcement at the download surface)
**Plans**: TBD

Plans:
- [ ] 05-01: S3 artifact serialization and save/load (no result data, PHI-safe)
- [ ] 05-02: Sharing, ACL enforcement, and download permission by tier
- [ ] 05-03: Fork, re-run against live session, and artifact diff

### Phase 6: Safety + Observability
**Goal**: Schema drift is detected and blocks execution before any SQL runs, Slack escalation is user-initiated with a workflow deep link, and every state transition is captured in an append-only audit log
**Depends on**: Phase 5
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, ESCALATION-01, ESCALATION-02, ESCALATION-03, ESCALATION-04, AUDIT-01, AUDIT-02
**Success Criteria** (what must be TRUE):
  1. When a saved MSA is re-run and a referenced table or column no longer exists, the entire execution is blocked before any SQL runs; the user sees a plain-English message identifying the missing dependency by name
  2. Schema drift fires a structured webhook to the data engineering team with the workflow ID, node ID, missing table/column name, and a deep link to the workflow
  3. A user can escalate to #data-analytics-support; the system prompts them to save first, then sends a Slack message with their name, refined question, SQL (if any), Claude's summary, and a workflow deep link — only after explicit confirmation
  4. If the Slack webhook fails, the user receives a clear plain-English message to reach out directly; the failure is logged
  5. Every SSA state transition writes an append-only audit record including timestamp, user identity, workflow ID, node ID, state, model tier, token counts, Snowflake query ID, and any escalation or drift events; audit log is never surfaced to end users
**Plans**: TBD

Plans:
- [ ] 06-01: Pre-run schema check and drift blocking with user message
- [ ] 06-02: Schema drift webhook to data engineering team
- [ ] 06-03: Slack escalation flow (save prompt, confirm, send, failure handling)
- [ ] 06-04: Append-only audit logging (state transitions, model tiers, token counts, events)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth + Session | 0/3 | Not started | - |
| 2. SSA Core | 0/6 | Not started | - |
| 3. SSA Polish + UI Shell | 0/4 | Not started | - |
| 4. MSA / DAG | 0/4 | Not started | - |
| 5. Persistence + Sharing | 0/3 | Not started | - |
| 6. Safety + Observability | 0/4 | Not started | - |
