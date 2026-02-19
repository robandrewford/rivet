---
Specification: Guided Data Analysis Interface (GDAI)

Version: 2.0 — Final, Ambiguity-Resolved
Date: 2026-02-18
Status: Ready for implementation

---
System Overview

GDAI is a guided data analysis interface that enables non-technical healthcare operations staff (~100 users) to conduct structured,
multi-step data analysis against live Snowflake data without writing SQL. Built on a forked Rivet codebase, it uses Claude as an AI
collaborator to translate business questions into executable queries, evaluate results, and guide users iteratively through a defined
analytical framework. It exists to eliminate the bottleneck between business user
s who own the questions and data analysts who currently
  own the tools.

---
Behavioral Contract

Authentication and Access

When a user navigates to the application, the system redirects to Microsoft SSO and does not render any application UI until
authentication succeeds.

When authentication succeeds, the system establishes the user's identity, reads their SSO group memberships to determine permission tier
  (standard or elevated), and opens a Snowflake session scoped to that user's existing Snowflake permissions. All subsequent query
execution uses this session.

When a user's SSO session expires mid-workflow, the system preserves their in-progress workflow state and prompts re-authentication
before allowing any further action. No data is lost.

Permission Tiers

When a user belongs to the administrator-managed SSO elevated-access group, they are granted elevated permissions: all standard
capabilities plus the ability to download MSA artifact files locally.

When a user does not belong to the elevated-access group, they have standard permissions: create, run, save, share, fork, and view
workflows within the application. No local download.

Single-Shot Analysis (SSA) — The Core Unit

When a user begins a new SSA node (either starting a new analysis or advancing from a prior node), the system enters a clarification
loop. A Haiku-class call first classifies task complexity and determines the working model tier for this step.

When the clarification loop is active, Claude asks targeted follow-up questions to resolve ambiguity in the user's question — scope,
time range, population, metric definition, success criteria, desired output format. The clarification loop runs as a chat interface
embedded within the SSA node on the DAG canvas. The DAG remains visible behind it. The node displays its current state label throughout.

When Claude has not been able to formulate an unambiguous research question after approximately 4–5 clarification exchanges, it
recommends escalation to a data analyst. Claude states clearly what it could not resolve and why. The user initiates the escalation; it
is never automatic. Before the Slack message is sent, the system prompts the user to save the current workflow so the data analyst
receives a link to the exact state.

When a user attempts to jailbreak the system (requesting data outside their Snowflake security context, asking unrelated questions,
attempting to override the system prompt), Claude declines politely and logs the attempt. If the user persists, Claude recommends
escalation via Slack and does not comply.

When a user asks a question outside the domain of their security context or outside clinical operations (HR data, unrelated financial
forecasts, non-RPM topics), Claude declines politely: "That's outside what I can help with here." Repeated attempts trigger an
escalation recommendation.

When the clarification loop produces an unambiguous research question, the system displays it as a plain-English statement and requires
explicit user confirmation before proceeding. The node transitions to "Confirmed" state.

When the user confirms the research question, Claude generates a SQL query (SELECT only) targeting the user's Snowflake environment. The
  model tier used is determined by the Haiku routing decision made at the start of this SSA:
- Haiku: Simple current-state queries — single table, no joins, straightforward aggregation
- Sonnet: Standard queries — multi-table joins, CTEs, date arithmetic, result evaluation, narrative summary, next-question pre-fill
- Opus: Causal analysis (step 2), multi-branch synthesis, any step where Claude's confidence is below threshold and escalation is being
considered

When SQL is generated, the node transitions to "Review SQL" state. The SQL is displayed in an editable editor within or beside the node.
  The user may edit it, accept it as-is, or discard it and rephrase their question.

When the user runs SQL (whether LLM-generated or manually edited), the node transitions to "Running query" state. The progress indicator
  updates through labeled phases:

1. Refining your question — during clarification loop
2. Generating query — Claude producing SQL
3. Running query — Snowflake executing
4. Reviewing results — Claude evaluating the result

Each phase transition is displayed in the node and in a persistent status area visible regardless of DAG zoom level.

When Snowflake returns a result, the node transitions to "Reviewing results" state. Claude evaluates the result before the user sees it.
  Claude assesses: does this result plausibly and correctly answer the confirmed research question? Claude's certainty language reflects
its actual confidence — direct and unqualified when certain, explicitly hedged when uncertain.

When Claude determines the result correctly addresses the research question, the node transitions to "Complete" state. The system
surfaces:
- A result view (table or summary, determined by query shape)
- A plain-English narrative authored by Claude, whose tone is friendly, not verbose, calibrated by the system prompt
- A pre-populated next recommended question for the following SSA node, which the user may accept, edit, or discard

When Claude determines the result does not correctly address the research question, the node transitions to "Revised" state. The system
surfaces Claude's plain-English assessment — what was retrieved, why it doesn't answer the question — and a recommended alternative
direction. The raw result is not presented as an answer. The node logs Claude's reasoning. The user may accept the recommendation,
rephrase, or escalate.

When Snowflake returns a SQL compilation or runtime error, Claude intercepts it before it reaches the user, translates it into plain
English, assesses the root cause, and presents a recommended alternative approach. The node transitions to "Failed" state. The raw error
  is logged for audit but never displayed to the user.

When Claude initiates an escalation recommendation, the system generates a Slack message to #data-analytics-support containing: the
user's name, the refined research question (or best attempt), the SQL executed (if any), Claude's plain-English summary of what it could
  not resolve, and a deep link in the format {APP_BASE_URL}/workflows/{workflow_id}. The message is sent only after the user saves the
workflow and confirms the escalation.

Audit Logging

When any SSA step begins or transitions state, the system writes an audit log entry containing: timestamp, user identity, workflow ID,
node ID, state transition, model tier used, token counts, Snowflake query ID (if applicable), and any escalation events. Audit logs are
written to a separate, append-only store and are used for troubleshooting, not surfaced to end users.

Multi-Shot Analysis (MSA) — The DAG

When a user accepts a result and advances, the system appends a new SSA node to the DAG connected to the prior node. The clarification
loop for the new node is pre-populated with Claude's recommended follow-up question, which the user may edit or replace entirely.

When Claude determines two diverging hypotheses are worth investigating simultaneously, it presents the user with a branching option
identifying both paths. The user accepts or declines. When accepted, the DAG forks into two parallel SSA nodes which execute
concurrently. Each runs its own full SSA cycle independently.

When both branches of a fork have reached "Complete" state, the system presents a merge option. When the user selects merge, an
Opus-class call synthesizes the outputs of both branches into a single narrative. The DAG records a merge node with that synthesis as
its output. The synthesis node clearly attributes which finding came from which branch.

When a user selects a prior node in the DAG, they may branch from that point, creating an alternative path without modifying the
existing path.

When a user prunes a branch, the system removes it from the active DAG view and marks it as archived in the artifact. It is not deleted
— it remains recoverable from the artifact.

When the DAG contains nodes using Rivet's built-in node types (used as pre-processing steps by the workflow author), those nodes execute
  as part of the DAG but are not editable or viewable by end users. The UI palette for end users shows only SSA-aware node types and
supporting structural types (branch, merge, synthesis). All ~40 original Rivet node types remain in the codebase and are available to
elevated users or workflow authors building pre-processing steps.

Saving, Sharing, and Forking

When a user saves an MSA, the system persists a single artifact to S3 (AWS us-east-1) containing: the full DAG structure, each SSA
node's confirmed research question, the SQL as executed (including any user edits, clearly distinguished from LLM-generated SQL),
Claude's evaluation narrative per node, node state, model tier used, and artifact metadata (owner, created, modified, version). Result
data is never stored in the artifact — SQL only. The artifact format is a single JSON file.

When a user saves an MSA, the system applies ACLs based on the user's sharing configuration. Sharing is available to any authenticated
user within the organization. No external sharing is permitted.

When a standard user accesses a shared workflow, they may view it and re-run it. They may not download the artifact file.

When an elevated user accesses any workflow, they may download the artifact JSON file locally in addition to all standard capabilities.

When a user re-runs a saved MSA, every SSA node executes against the current user's Snowflake session context and current live data. The
  original author's context, session, or data state is never used.

When a user forks a saved MSA, the system creates a new independent copy owned by the forking user. The fork is a new artifact. Changes
to the fork do not affect the original.

When two instances of the same MSA artifact are executed under identical Snowflake state and user context, they produce identical
results. Claude's non-determinism must not affect query construction or result structure. Narrative summaries may vary in phrasing but
must not vary in factual content derived from the result.

When a user requests a diff between two MSA artifacts, the system compares them structurally: nodes added, removed, or modified (by node
  ID); SQL changes per node; confirmed research question changes per node. No result data is compared. The diff is displayed in a
readable side-by-side format.

Schema Drift

When any SSA node in a saved MSA references a Snowflake table or column that no longer exists at re-run time, the system detects this
before executing any SQL, blocks execution entirely, notifies the user in plain English identifying the missing dependency by name, and
fires a structured alert to the data engineering team's configured git action / CI webhook. The alert includes: workflow artifact ID,
node ID, missing table or column name, and a link to the workflow.

When schema drift is detected, the system does not attempt to substitute an alternative column or table, does not execute any node in
the MSA, and does not modify the artifact.

Analysis Framework Navigation — V1 Scope

When a user begins a new analysis, the system presents three available analytical steps:
1. What happened? — Historical trend reporting
2. Why did this happen? — Causal analysis
3. What is happening now? — Current-state reporting

When a user completes a step and advances, the next step's clarification loop is contextualized with the results and refined questions
from prior steps in the current MSA.

Steps 4 (forecasting), 5 (goal-setting), and 6 (prescriptive analytics) are not available in V1. The navigation UI is built to
accommodate them as future additions without structural rework. They must not be accessible, triggered, or referenced in the V1
interface.

---
Explicit Non-Behaviors

The system must not execute any Snowflake statement that modifies data (INSERT, UPDATE, DELETE, CREATE, DROP, TRUNCATE, MERGE) because
the system is read-only by design and data modification would create unacceptable risk in a healthcare environment.

The system must not display raw SQL error messages, stack traces, or Snowflake error codes to end users because this creates confusion
and exposes internal schema details to non-technical users.

The system must not surface a query result as a valid answer without Claude first evaluating it, because unchecked results presented as
answers are the primary failure mode this system is designed to prevent.

The system must not send a Slack escalation without the user explicitly initiating it, because escalation is a recommendation Claude
makes after exhausting clarification options — the decision belongs to the user.

The system must not share workflow artifacts outside the organization because RPM billing and patient engagement data is operationally
sensitive.

The system must not allow standard users to download artifact files locally because local storage bypasses S3 ACL controls.

The system must not expose steps 4, 5, or 6 in V1 because those capabilities are deferred to future releases.

The system must not enforce data access control at the application layer because Snowflake row/column-level security is the
authoritative control, and duplicating it in the application would create a maintainability risk and a false sense of security.

The system must not proceed with any MSA execution when schema drift is detected, because silent execution against a changed schema
produces wrong results with no indication to the user.

The system must not store Snowflake result data in MSA artifacts because result data may contain PHI and user security context is the
appropriate access control mechanism — re-running is required to see results.

The system must not allow Claude's response non-determinism to affect which SQL is executed or what result structure is returned,
because workflow reproducibility is a core requirement.

The system must not expose Rivet's built-in node type palette to end users, because those nodes are reserved for pre-processing steps
authored by workflow builders and must not be altered by end users.

---
Integration Boundaries

Snowflake

Data in: SELECT-only SQL queries, generated by Claude or edited by the user.
Data out: Tabular result sets, up to 5 million rows.
Contract: The application connects using the authenticated user's Snowflake credentials, established at login via SSO. All queries
execute under that user's existing Snowflake permissions. The application maintains no privileged service account.
Unavailability: Handled at the infrastructure level by the data engineering team (separate project). The application surfaces a clear
"data source unavailable" message, preserves in-progress workflow state, and does not retry automatically.
Unexpected data: Claude evaluates all results. Unexpected schema, nulls, or empty result sets are treated as signals for Claude to
assess and explain — not application errors to throw.
Development: Use a designated Snowflake development environment with representative, de-identified data. Never point development
instances at production.

Claude API (Anthropic)

Data in: System prompt (constitution), conversation history, refined research questions, generated SQL, Snowflake result sets
(summarized or sampled where large), schema metadata.
Data out: Clarifying questions, refined research questions, SQL (SELECT only), plain-English result evaluations, narrative summaries,
next-question pre-fills, escalation assessments, routing decisions.
Model routing: A Haiku call at the start of each SSA step classifies task complexity and returns the working model for that step. Tiers:
  Haiku (routing decisions, simple clarification, simple current-state SQL); Sonnet (standard SQL generation, result evaluation,
narrative, next-question pre-fill); Opus (causal analysis, multi-branch synthesis, low-confidence escalation consideration).
Unavailability: Display a clear message that the AI assistant is temporarily unavailable. Preserve workflow state. Do not fall back to a
  mode that presents unvalidated results.
Rate limiting: Surface a "please wait and retry" message with elapsed time. Do not silently queue requests.
Development: Use the real Claude API. No simulated twin.

Microsoft SSO

Data in: User authentication request.
Data out: Authenticated user identity, SSO group memberships (used to determine standard vs. elevated permission tier).
Contract: Standard OAuth/OIDC flow. The elevated-access group name is a deploy-time configuration value.
Unavailability: Application is inaccessible. No local fallback.

AWS S3 (us-east-1) — Workflow Artifact Storage

Data in: Serialized MSA artifacts (JSON) on save.
Data out: Retrieved artifacts for re-run, fork, share, diff.
Format: Single JSON file per MSA artifact. Contains DAG structure, SSA node metadata, confirmed research questions, SQL as executed,
Claude evaluation narratives, node states, model tiers used, and artifact metadata. Contains no Snowflake result data.
ACLs: Enforced at the S3 bucket/object level, tied to user identity from SSO. Bucket policy and object ACLs are the authoritative access
  control for artifacts.
Unavailability: User cannot save, load, or share workflows. In-progress work is not lost — only persistence fails. Surface a clear
error.

Slack

Data in: Escalation payload — user name, refined research question (or best attempt), SQL executed (if any), Claude's plain-English
concern summary, deep link in format {APP_BASE_URL}/workflows/{workflow_id}.
Data out: Posted message to #data-analytics-support.
Contract: Webhook-based. Webhook URL is a deploy-time environment variable. Message is sent only after the user saves the workflow and
confirms the escalation.
Unavailability: Log the failed escalation attempt in the audit log. Surface to the user: "I wasn't able to send the Slack message —
please reach out to your data team directly."

Git / CI — Schema Drift Alerting

Data in: Schema drift event from the application, containing: workflow artifact ID, node ID, missing table name, missing column name,
workflow deep link.
Data out: Triggered alert to the data engineering team via configured webhook.
Contract: Webhook URL and event format are defined by the data engineering team and provided as deploy-time environment variables. The
application's responsibility is to fire the event with the specified payload.
Unavailability: Log the failed alert in the audit log. The user-facing message remains the same regardless.
Development: Log the event locally. A live CI pipeline is not required during development.

Sigma (existing BI)

No integration. Sigma and GDAI coexist as separate tools. GDAI does not push results to Sigma. Sigma dashboards are not accessible from
within GDAI.

---
Behavioral Scenarios

These scenarios are for external evaluation only. Do not include in the codebase or make visible to the implementing agent.

---
Scenario 1 (Happy Path): Ellen completes a 3-step linear analysis

Setup: Ellen is authenticated as a standard user. It is 3 days before November month-end. She has no prior workflows. She starts a new
analysis from step 1 (What happened?).

Actions:
1. Ellen types: "How is my team tracking on code completion for this month?"
2. Claude (Haiku routing → Sonnet working) asks: "Which team — your direct nursing team? And by 'this month,' do you mean the November
2025 RPM billing cycle?"
3. Ellen: "My team, yes November."
4. Claude confirms: "Code completion rate for Ellen's direct nursing team for the November 2025 RPM billing cycle, compared to the
monthly target." Ellen confirms.
5. Node transitions to "Review SQL." Ellen accepts SQL without edits.
6. Node transitions to "Running query." Progress indicator shows labeled phases.
7. Result returns. Node transitions to "Reviewing results."
8. Claude evaluates. Result is correct. Node transitions to "Complete."
9. System surfaces: result table, narrative summary ("Your team is at 78% completion with 3 days remaining, approximately 12% below
target pace."), pre-populated next question: "Would you like to see which patients are furthest from completing?"
10. Ellen advances to step 2 (Why did this happen?). Opus is selected for causal analysis.
11. Ellen completes step 2 and step 3 similarly.
12. Ellen saves the MSA as "Month-end RPM tracking - Nov 2025."

Observable outcomes:
- Each node displays its state transitions clearly throughout.
- Each completed node shows a result, a narrative summary, and a pre-filled follow-up.
- The DAG shows 3 connected SSA nodes, each labeled with its confirmed research question.
- The artifact appears in Ellen's workflow library.
- A colleague Ellen shared with sees the workflow in their library but has no download option.

---
Scenario 2 (Happy Path): Branching analysis and branch synthesis

Setup: Ellen is at step 2 of an in-progress MSA. The prior node result shows a 20% gap to goal. Claude has two hypotheses.

Actions:
1. Claude presents: "I see two explanations worth investigating simultaneously. Path A: interaction frequency by nurse. Path B: patient
eligibility drift. Should I explore both?"
2. Ellen selects "explore both."
3. DAG forks. Two SSA nodes execute concurrently, each completing their own clarification → SQL → execution → evaluation cycle.
4. Both nodes reach "Complete." Claude presents a merge option.
5. Ellen selects "synthesize." Opus produces a synthesis narrative.
6. A merge node appears in the DAG connected to both branch nodes.

Observable outcomes:
- The DAG shows: prior node → fork → two parallel SSA nodes → merge node.
- The synthesis narrative attributes findings to each branch explicitly.
- The merge node is what advances in the workflow.
- The artifact captures the full branching structure, both SQL queries, both evaluations, and the synthesis.
- Pruning one branch archives it in the artifact without deleting it.

---
Scenario 3 (Happy Path): Forking and re-running a shared workflow

Setup: Maria is a standard user managing a different team. Ellen has shared "Month-end RPM tracking - Nov 2025" with all care managers.

Actions:
1. Maria sees Ellen's workflow in her library.
2. Maria forks it, naming it "Month-end RPM tracking - Nov 2025 - Maria's Team."
3. Maria runs her fork. All SSA nodes execute against Snowflake using Maria's credentials.

Observable outcomes:
- Maria's results reflect her team's data under her Snowflake permissions.
- Ellen's original artifact is unchanged.
- Maria's fork appears as a separate artifact in Maria's library, owned by Maria.
- The DAG structure of the fork is identical to Ellen's; inputs and outputs differ.
- Maria has no download option (standard user).

---
Scenario 4 (Error): SQL compilation fails

Setup: Ellen asks a question with ambiguous scope. Claude generates SQL that references a column alias incorrectly.

Actions:
1. Ellen accepts the SQL. Node transitions to "Running query."
2. Snowflake returns a compilation error.
3. Claude intercepts it before the user sees anything.

Observable outcomes:
- Ellen never sees a raw Snowflake error.
- The node transitions to "Failed" state.
- Claude's message appears in the node: "I wasn't able to get that data — the query had a structural problem I should be able to fix.
I'd suggest we try [alternative approach]. Want to proceed?"
- The raw error is written to the audit log with the Snowflake error code, query ID, and timestamp.
- Ellen can accept the recommendation, rephrase, or discard the node.

---
Scenario 5 (Error): Claude determines result is semantically incorrect

Setup: Ellen asks for code completion rate by nurse. SQL executes successfully and returns data. Claude evaluates it and determines the
metric is total patient interactions, not distinct-patient completion status.

Actions:
1. Snowflake returns data. Node transitions to "Reviewing results."
2. Claude evaluates it against the confirmed research question.
3. Claude determines the metric is wrong.

Observable outcomes:
- The result is not surfaced to Ellen as an answer.
- The node transitions to "Revised" state.
- Claude's message: "I got data back, but it doesn't correctly answer your question. What I have is total interactions per nurse — your
question asks how many patients have completed all required billing codes. Those are different. I'd suggest we reframe the query. Want
me to try that?"
- Claude's reasoning is logged in the node and in the audit log.
- Ellen can accept, rephrase, or escalate.

---
Scenario 6 (Edge Case): User edits LLM-generated SQL

Setup: Ellen reviews Claude's generated SQL and changes the date filter to a specific hardcoded range she knows matches her billing
cycle precisely.

Actions:
1. Ellen modifies the date filter in the SQL editor within the node.
2. Ellen runs the modified SQL.
3. Snowflake returns results. Claude evaluates.

Observable outcomes:
- Snowflake executes Ellen's modified SQL, not the original.
- The artifact records the user-modified SQL, clearly flagged as user-edited (not LLM-generated).
- If the modification changes the scope relative to the confirmed research question, Claude's narrative notes it: "Note: this result
covers [Ellen's date range], which differs from the full November billing cycle in your original question."
- Claude does not silently treat the modified SQL as equivalent to the original intent.

---
Scenario 7 (Edge Case): Saved workflow re-run after schema drift

Setup: Three weeks after Ellen saved her workflow, a data engineer dropped a column that SSA node 2 depends on. Ellen re-opens and runs
the workflow.

Actions:
1. Ellen clicks "Run" on the saved MSA.
2. The system performs a schema pre-check against all SSA nodes before executing any SQL.
3. The system detects the missing column in node 2.

Observable outcomes:
- No SQL executes on any node.
- Ellen sees: "This workflow can't run because a data field it depends on — [column name] in [table name] — no longer exists. Your data
team has been notified."
- The data engineering team receives a structured alert via the configured CI webhook: workflow ID, node ID, missing column, missing
table, workflow deep link.
- The workflow artifact is not modified.
- The audit log records the drift detection event with full context.

---
Implementation Constraints

Foundation: Forked Rivet codebase (TypeScript/Node). The DAG UI, graph model, and all ~40 built-in node types are preserved. A new
GDAI-specific SSA node type and supporting structural types (branch, merge, synthesis) are added. The end-user UI palette is filtered to
  show only GDAI node types. Built-in Rivet node types remain available to workflow authors building pre-processing steps. Do not
introduce a second runtime language without explicit approval.

LLM: Claude API (Anthropic). Three tiers: Haiku (routing, simple clarification, simple SQL), Sonnet (standard SQL, evaluation,
narrative), Opus (causal analysis, synthesis, escalation). Haiku makes the routing decision at the start of each SSA step. No other LLM
provider.

Database: Snowflake, AWS us-east-1. SELECT only. User-credential-scoped connections established at login. Maximum result set: 5 million
rows.

Auth: Microsoft SSO via OAuth/OIDC. SSO group membership determines permission tier. The elevated-access group name is a deploy-time
environment variable.

Artifact storage: AWS S3, us-east-1. Single JSON file per MSA artifact. No result data stored — SQL and metadata only. ACLs enforced at
the S3 layer.

Audit logging: Append-only. Every SSA state transition, model tier selection, token count, Snowflake query ID, escalation event, and
schema drift event is logged. Not surfaced to end users.

Escalation channel: Slack #data-analytics-support. Webhook URL is a deploy-time environment variable. Deep link format:
{APP_BASE_URL}/workflows/{workflow_id}. APP_BASE_URL is a deploy-time environment variable.

Schema drift webhook: URL and payload format defined by the data engineering team, provided as deploy-time environment variables.

Concurrency target: Up to 70 simultaneous active users.

Response envelope: Each SSA step (clarification through result surfaced) must complete within approximately 60 seconds under normal
Snowflake and Claude API conditions.

V1 analysis steps: 1 (historical), 2 (causal), 3 (current state) only. Navigation UI must accommodate steps 4–6 as future additions
without structural rework. Steps 4–6 must not be accessible, triggerable, or referenced in the V1 interface.

Constitution: The Claude system prompt governing tone, domain boundaries, escalation behavior, certainty language, and jailbreak
handling is a separate deliverable. It must be authored by a domain expert before implementation begins and provided to the agent as a
configuration artifact — not generated by the agent itself.

---
No ambiguity warnings remain. This specification is ready to hand to a coding agent. Deliver the constitution as a separate artifact
before implementation begins — it is the only outstanding dependency.
