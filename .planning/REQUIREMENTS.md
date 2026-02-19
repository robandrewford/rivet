# Requirements: GDAI — Guided Data Analysis Interface

**Defined:** 2026-02-18
**Core Value:** Non-technical healthcare ops staff can ask a business question, get a validated answer from live Snowflake data, and advance to the next question — without writing SQL or involving a data analyst.

## v1 Requirements

### Authentication (AUTH)

- [ ] **AUTH-01**: User is redirected to Microsoft SSO on navigation; no application UI renders until authentication succeeds
- [ ] **AUTH-02**: After Microsoft SSO authentication, system determines permission tier (standard or elevated) from the user's Snowflake role/permissions
- [ ] **AUTH-03**: System establishes a Snowflake session scoped to the authenticated user's existing credentials at login
- [ ] **AUTH-04**: System preserves in-progress workflow state when SSO session expires and prompts re-authentication before allowing further action
- [ ] **AUTH-05**: Elevated users can download MSA artifact JSON files locally
- [ ] **AUTH-06**: Standard users cannot download artifact files locally

### Single-Shot Analysis Node (SSA)

- [ ] **SSA-01**: SSA node type is registered in the Rivet node registry with its own execution lifecycle and state machine
- [ ] **SSA-02**: SSA node hosts a clarification loop as a chat interface embedded within the node on the DAG canvas; DAG remains visible behind it
- [ ] **SSA-03**: A Haiku routing call at SSA step start classifies task complexity and selects the working model tier (Haiku/Sonnet/Opus)
- [ ] **SSA-04**: Model tier logic: Haiku for simple current-state queries, Sonnet for standard SQL/evaluation/narrative, Opus for causal analysis/synthesis/low-confidence escalation
- [ ] **SSA-05**: Node displays its current state label throughout: Refining / Confirmed / Review SQL / Running query / Reviewing results / Complete / Revised / Failed
- [ ] **SSA-06**: After approximately 4–5 unresolved clarification exchanges, Claude recommends escalation, states what it could not resolve, and why; escalation is never automatic
- [ ] **SSA-07**: System displays the confirmed research question as a plain-English statement and requires explicit user confirmation before SQL generation
- [ ] **SSA-08**: Claude generates SELECT-only SQL after confirmation; SQL displayed in editable editor within or beside the node
- [ ] **SSA-09**: User may edit SQL, accept as-is, or discard and rephrase; edits are allowed
- [ ] **SSA-10**: Labeled progress phases visible during execution: Refining your question → Generating query → Running query → Reviewing results
- [ ] **SSA-11**: Progress indicator remains visible regardless of DAG zoom level
- [ ] **SSA-12**: Claude evaluates every Snowflake result before the user sees it; user never sees unvalidated results
- [ ] **SSA-13**: When result correctly answers the confirmed question: node → Complete; system surfaces result view, plain-English narrative, and pre-populated next-question recommendation
- [ ] **SSA-14**: When result does not correctly answer the question: node → Revised; raw result not shown; Claude surfaces assessment, explains what was retrieved vs. what was asked, and recommends alternative direction
- [ ] **SSA-15**: When Snowflake returns a SQL compilation or runtime error: Claude intercepts before user sees it, translates to plain English, presents recommended alternative; node → Failed; raw error logged, never displayed
- [ ] **SSA-16**: User-edited SQL is stored in the artifact clearly flagged as user-edited, distinct from LLM-generated SQL
- [ ] **SSA-17**: Out-of-scope requests and jailbreak attempts trigger polite decline; repeated attempts trigger escalation recommendation; attempts are logged
- [ ] **SSA-18**: Claude's certainty language reflects actual confidence — direct when certain, explicitly hedged when uncertain

### Multi-Shot Analysis / DAG (MSA)

- [ ] **MSA-01**: Accepting a result appends a new SSA node to the DAG connected to the prior node
- [ ] **MSA-02**: New SSA node's clarification loop is pre-populated with Claude's recommended follow-up question; user may edit or replace entirely
- [ ] **MSA-03**: Claude can present a branching proposal identifying two diverging hypotheses worth investigating simultaneously
- [ ] **MSA-04**: User accepts or declines branch proposals; DAG branching is never automatic
- [ ] **MSA-05**: Two parallel SSA nodes execute concurrently when a branch is accepted; each runs its full SSA cycle independently
- [ ] **MSA-06**: When both parallel branches reach Complete, system presents a merge option
- [ ] **MSA-07**: Merge synthesis uses Opus and produces a single narrative attributing findings explicitly to each branch
- [ ] **MSA-08**: Merge node appears in DAG connected to both branch nodes; merge node output is what advances the workflow
- [ ] **MSA-09**: User can branch from any prior DAG node to create an alternative path without modifying the existing path
- [ ] **MSA-10**: User can prune a branch; pruned branch is archived (not deleted) in the artifact and remains recoverable

### Analysis Framework Navigation (FRAMEWORK)

- [ ] **FRAMEWORK-01**: New analysis presents three available steps: 1 (What happened? — historical), 2 (Why did this happen? — causal), 3 (What is happening now? — current-state)
- [ ] **FRAMEWORK-02**: Each step's clarification loop is contextualized with results and refined questions from prior steps in the current MSA
- [ ] **FRAMEWORK-03**: Navigation UI is structured to accommodate steps 4–6 as future additions without structural rework
- [ ] **FRAMEWORK-04**: Steps 4–6 are not accessible, triggerable, or referenced in the V1 interface

### End-User Node Palette (PALETTE)

- [ ] **PALETTE-01**: End-user node palette shows only GDAI node types: SSA, branch, merge, synthesis
- [ ] **PALETTE-02**: All Rivet built-in node types remain in the codebase and are available to elevated users and workflow authors building pre-processing steps
- [ ] **PALETTE-03**: Rivet built-in nodes present in a workflow DAG execute as part of the DAG but are not editable or viewable by standard end users

### Workflow Artifact Storage (STORAGE)

- [ ] **STORAGE-01**: MSA save persists a single JSON artifact to S3 (us-east-1) containing: full DAG structure, confirmed research question per node, SQL as executed (user edits flagged), Claude evaluation narratives, node states, model tiers used, artifact metadata (owner, created, modified, version)
- [ ] **STORAGE-02**: Artifact never contains Snowflake result data
- [ ] **STORAGE-03**: Sharing is available to any authenticated org user; no external sharing permitted
- [ ] **STORAGE-04**: Shared workflow recipients can view the workflow and re-run it
- [ ] **STORAGE-05**: Re-run executes all SSA nodes against the current user's Snowflake session and current live data; original author's context is never used
- [ ] **STORAGE-06**: Fork creates a new independent artifact owned by the forking user; changes to the fork do not affect the original
- [ ] **STORAGE-07**: Artifact diff shows structural comparison: nodes added/removed/modified (by node ID), SQL changes per node, confirmed question changes per node; no result data compared; displayed in readable side-by-side format

### Schema Drift Detection (SCHEMA)

- [ ] **SCHEMA-01**: System performs a schema pre-check against all SSA nodes before executing any SQL when a saved MSA is re-run
- [ ] **SCHEMA-02**: Schema drift blocks entire MSA execution; no SQL executes on any node
- [ ] **SCHEMA-03**: User receives a plain-English message identifying the missing table or column by name
- [ ] **SCHEMA-04**: Schema drift fires a structured webhook alert to the data engineering team containing: workflow artifact ID, node ID, missing table/column name, workflow deep link
- [ ] **SCHEMA-05**: Artifact is not modified when schema drift is detected

### Escalation (ESCALATION)

- [ ] **ESCALATION-01**: Before sending the Slack message, system prompts user to save current workflow so analyst receives a link to exact state
- [ ] **ESCALATION-02**: Slack message to #data-analytics-support includes: user name, refined question (or best attempt), SQL executed (if any), Claude's plain-English concern summary, deep link in format {APP_BASE_URL}/workflows/{workflow_id}
- [ ] **ESCALATION-03**: Slack escalation is sent only after user saves the workflow and explicitly confirms the escalation
- [ ] **ESCALATION-04**: Slack webhook failure is logged in audit log; user receives: "I wasn't able to send the Slack message — please reach out to your data team directly"

### Audit Logging (AUDIT)

- [ ] **AUDIT-01**: Append-only audit log records per SSA state transition: timestamp, user identity, workflow ID, node ID, state transition, model tier used, token counts, Snowflake query ID (if applicable), escalation events, schema drift events
- [ ] **AUDIT-02**: Audit log is written to a separate, append-only store; not surfaced to end users

### Reproducibility (REPRO)

- [ ] **REPRO-01**: Two executions of the same MSA artifact under identical Snowflake state and user context produce identical results; Claude non-determinism must not affect SQL construction or result structure (narrative phrasing may vary, factual content must not)

## v2 Requirements

### Analysis Framework Extensions

- **FRAMEWORK-05**: Step 4 — Forecasting analysis
- **FRAMEWORK-06**: Step 5 — Goal-setting analysis
- **FRAMEWORK-07**: Step 6 — Prescriptive analytics

## Out of Scope

| Feature | Reason |
|---------|--------|
| Steps 4–6 capabilities | Deferred to v2+; UI slots built in v1 without the capability |
| External sharing (outside org) | RPM billing and patient engagement data is operationally sensitive |
| Sigma integration | Coexist as separate tools; GDAI does not push to Sigma |
| Automatic escalation | Escalation is always user-initiated; Claude recommends, user decides |
| Snowflake result data in artifacts | PHI risk; user security context is the correct access control — re-run required |
| Application-layer data access control | Snowflake RLS is authoritative; duplicating it creates maintainability risk and false security |
| Non-SELECT SQL (INSERT, UPDATE, DELETE, CREATE, DROP, etc.) | Read-only by design; data modification is unacceptable risk in healthcare |
| Raw Snowflake errors shown to users | Claude always intercepts and translates |
| Privileged Snowflake service account | All queries execute under authenticated user's existing permissions |
| Automatic retry on Snowflake unavailability | Surface clear error, preserve state, don't retry |
| Second runtime language | TypeScript/Node only without explicit approval |
| Local auth fallback | Microsoft SSO unavailability = application inaccessible |

## Traceability

*Populated: 2026-02-18 (roadmap created)*

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| SSA-01 | Phase 2 | Pending |
| SSA-02 | Phase 2 | Pending |
| SSA-03 | Phase 2 | Pending |
| SSA-04 | Phase 2 | Pending |
| SSA-05 | Phase 2 | Pending |
| SSA-07 | Phase 2 | Pending |
| SSA-08 | Phase 2 | Pending |
| SSA-09 | Phase 2 | Pending |
| SSA-10 | Phase 2 | Pending |
| SSA-11 | Phase 2 | Pending |
| SSA-12 | Phase 2 | Pending |
| SSA-13 | Phase 2 | Pending |
| SSA-06 | Phase 3 | Pending |
| SSA-14 | Phase 3 | Pending |
| SSA-15 | Phase 3 | Pending |
| SSA-16 | Phase 3 | Pending |
| SSA-17 | Phase 3 | Pending |
| SSA-18 | Phase 3 | Pending |
| FRAMEWORK-01 | Phase 3 | Pending |
| FRAMEWORK-02 | Phase 3 | Pending |
| FRAMEWORK-03 | Phase 3 | Pending |
| FRAMEWORK-04 | Phase 3 | Pending |
| PALETTE-01 | Phase 3 | Pending |
| PALETTE-02 | Phase 3 | Pending |
| PALETTE-03 | Phase 3 | Pending |
| MSA-01 | Phase 4 | Pending |
| MSA-02 | Phase 4 | Pending |
| MSA-03 | Phase 4 | Pending |
| MSA-04 | Phase 4 | Pending |
| MSA-05 | Phase 4 | Pending |
| MSA-06 | Phase 4 | Pending |
| MSA-07 | Phase 4 | Pending |
| MSA-08 | Phase 4 | Pending |
| MSA-09 | Phase 4 | Pending |
| MSA-10 | Phase 4 | Pending |
| STORAGE-01 | Phase 5 | Pending |
| STORAGE-02 | Phase 5 | Pending |
| STORAGE-03 | Phase 5 | Pending |
| STORAGE-04 | Phase 5 | Pending |
| STORAGE-05 | Phase 5 | Pending |
| STORAGE-06 | Phase 5 | Pending |
| STORAGE-07 | Phase 5 | Pending |
| REPRO-01 | Phase 5 | Pending |
| SCHEMA-01 | Phase 6 | Pending |
| SCHEMA-02 | Phase 6 | Pending |
| SCHEMA-03 | Phase 6 | Pending |
| SCHEMA-04 | Phase 6 | Pending |
| SCHEMA-05 | Phase 6 | Pending |
| ESCALATION-01 | Phase 6 | Pending |
| ESCALATION-02 | Phase 6 | Pending |
| ESCALATION-03 | Phase 6 | Pending |
| ESCALATION-04 | Phase 6 | Pending |
| AUDIT-01 | Phase 6 | Pending |
| AUDIT-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 60 total (note: original count of 55 was incorrect; actual count is 60)
- Mapped to phases: 60/60
- Unmapped: 0

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 — traceability populated after roadmap creation*
