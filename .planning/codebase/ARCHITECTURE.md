# Architecture

**Analysis Date:** 2026-02-18

## Pattern Overview

**Overall:** Node graph execution engine with plugin architecture. Rivet is a visual IDE and runtime for building complex AI agent workflows as directed acyclic graphs (DAGs). The core engine processes nodes in dependency order, with support for control flow, data streaming, vector operations, and external integrations.

**Key Characteristics:**
- Graph-based computation model: nodes represent operations, connections represent data flow
- Plugin-extensible node registry: built-in nodes plus plugin-provided nodes
- Multi-process execution with queue management: nodes can execute in parallel within dependency constraints
- Event-driven architecture: emits lifecycle events (nodeStart, nodeFinish, graphStart, graphFinish)
- Supports streaming, partial outputs, and multirun operations
- Type-checked data values with coercion rules
- Desktop (Tauri) + Web (React) UI layer
- CLI for running and serving graphs as REST API

## Layers

**Core Execution Engine (rivet-core):**
- Purpose: Parse and execute node graphs, manage state, emit events
- Location: `packages/core/src/`
- Contains: `GraphProcessor.ts` (67K lines - execution orchestration), node implementations, data types, integrations
- Depends on: TypeScript stdlib, lodash, emittery, p-queue, external service SDKs (OpenAI, Anthropic, etc.)
- Used by: rivet-app, rivet-node, rivet-cli, custom applications

**Desktop Application (rivet-app):**
- Purpose: Visual graph editor and development environment
- Location: `packages/app/src/`
- Contains: React components, state management, hooks, UI interactions
- Depends on: rivet-core, React, Atlaskit UI library, @tanstack/react-query
- Used by: End users building graphs

**Node Runtime (rivet-node):**
- Purpose: Node.js compatible runtime for executing graphs programmatically
- Location: `packages/node/src/`
- Contains: Node-specific native bindings, debugger support, API
- Depends on: rivet-core, Node.js native modules
- Used by: Backend servers, CLI tools

**CLI Tool (rivet-cli):**
- Purpose: Command-line interface for running graphs and serving as REST API
- Location: `packages/cli/src/`
- Contains: `run` command (execute a graph), `serve` command (REST endpoint)
- Depends on: rivet-node, yargs
- Used by: DevOps, backend integration, testing

**Model/Schema Layer:**
- Purpose: Type definitions for graph structure, nodes, data values
- Location: `packages/core/src/model/`
- Contains: `NodeBase.ts` (node definition), `DataValue.ts` (data types), `Project.ts`, `NodeGraph.ts`, `ProcessContext.ts`
- Defines the contract for all nodes and data flowing through the system

**Plugin Registry:**
- Purpose: Manage built-in nodes and dynamic plugin registration
- Location: `packages/core/src/model/Nodes.ts`, `packages/core/src/model/NodeRegistration.ts`
- Pattern: Each node type (ChatNode, HTTPCallNode, etc.) has corresponding file in `packages/core/src/model/nodes/`
- 86+ built-in nodes covering: LLM calls, data transformation, control flow, external APIs

**Integration Layer:**
- Purpose: Vendor-specific implementations for LLMs, embeddings, databases
- Location: `packages/core/src/integrations/` and `packages/core/src/plugins/`
- Contains: LLM providers (OpenAI, Anthropic, Google), vector DBs (Pinecone), audio providers, code runners
- Pattern: Each integration can have multiple nodes (e.g., multiple chat nodes for different LLM providers)

**UI State Management (rivet-app):**
- Purpose: Manage application state - graphs, execution, settings
- Location: `packages/app/src/state/`
- Contains: Zustand-based store slices (graph.ts, execution.ts, savedGraphs.ts, settings.ts, dataFlow.ts, etc.)
- Pattern: Slice-per-concern for modularity

**Components Layer (rivet-app):**
- Purpose: React components for UI rendering
- Location: `packages/app/src/components/`
- Contains: Main UI components (NavigationBar, GraphList, GraphBuilder), node-specific editors, data visualizers
- Pattern: Organized by feature (nodes/, editors/, dataStudio/, community/, trivet/)

## Data Flow

**Graph Execution Flow:**

1. **Load Phase**: GraphProcessor reads project, preprocesses graph structure
   - `#preprocessGraph()`: creates node instances, stores connections
   - `#loadInputOutputDefinitions()`: caches input/output port definitions
   - `#tarjanSCC()`: detects cycles (for validation)

2. **Process Phase**: Recursive topological traversal with queue
   - `process(inputs)`: entry point, emits processStart
   - `#processGraph()`: main loop, processes nodes in dependency order
   - Maintains `#remainingNodes`, `#currentlyProcessing`, `#queuedNodes`

3. **Node Execution**:
   - `#executeNode()`: retrieves input values from connections
   - Coerces inputs to expected types
   - Calls node's `process()` method
   - Handles streaming outputs via `partialOutput` event
   - Stores results in `#nodeResults`

4. **Data Propagation**:
   - Node outputs flow to connected inputs
   - Values go through type coercion (if enabled)
   - Handles array splitting (if isSplitRun is true on node)
   - Can pause at specific nodes (`runToNodeIds`) or resume from specific nodes (`runFromNodeId`)

5. **Emit Events** throughout:
   - `start`: graph execution begins
   - `graphStart`/`graphFinish`: subgraph lifecycle
   - `nodeStart`/`nodeFinish`/`nodeError`/`nodeExcluded`: per-node tracking
   - `partialOutput`: streaming results
   - `userInput`: awaiting user interaction

**State Management:**
- Graph-level: `#nodeResults` (Map<NodeId, NodeResult>)
- Execution-level: `#erroredNodes`, `#remainingNodes`, `#visitedNodes`, `#currentlyProcessing`
- Context: `ProcessContext` passed to each node (provides access to external functions, globals, recording, etc.)
- Global values: `#globals` (Map<string, DataValue>) accessible via GetGlobalNode/SetGlobalNode

## Key Abstractions

**Node:**
- Interface: `ChartNode<Type, Data>`
- Contains: id, type, title, description, data (node-specific config), visualData (position/color), connections
- Life cycle: create → getInputDefinitions → process → getOutputDefinitions
- Example: `ChatNode` with data like {model, temperature, system message}

**NodeImpl / PluginNodeImpl:**
- Abstract class: `NodeImpl<T>` - defines contract for node execution
- Implementations: `ChatNodeBase.ts`, `CodeNode.ts`, `HttpCallNode.ts`, etc.
- Methods: `getInputDefinitions()`, `getOutputDefinitions()`, `process()`, `getEditors()`, `getBody()`
- Purpose: Each node type implements how it transforms inputs to outputs

**DataValue:**
- Tagged union: `StringDataValue | NumberDataValue | BoolDataValue | ObjectDataValue | ArrayDataValue | ChatDataValue | etc.`
- Always has shape: `{ type: 'string', value: 'hello' }`
- Enables type-safe, serializable data flow
- Supports coercion rules (e.g., "123" → 123 if type expected is number)

**NodeGraph:**
- Structure: `{ nodes: ChartNode[], connections: NodeConnection[] }`
- Connection: `{ outputNodeId, inputNodeId, outputId, inputId }`
- Immutable: modifications create new graphs (functional approach)

**Project:**
- Structure: `{ graphs: Record<GraphId, NodeGraph>, metadata, variables, secrets }`
- Graphs keyed by ID, can reference each other via CallGraphNode
- Metadata includes mainGraphId, version, revisions

**ProcessContext:**
- Passed to every node during execution
- Provides: recursive `executeSubgraph()`, external functions registry, globals access, abort signals, recording interface
- Enables nodes to call other graphs or code

**Plugin:**
- Type: `RivetPlugin`
- Provides: register() callback to define new nodes, config spec, context menu groups
- Loaded via `plugins.ts`, registered in `globalRivetNodeRegistry`
- Examples: `plugins/anthropic/`, `plugins/google/`, `plugins/pinecone/`

## Entry Points

**Desktop (Electron/Tauri):**
- Location: `packages/app/src/index.tsx`
- Flow: index.tsx → App.tsx → RivetAppLoader → React query provider → main editor UI
- Launches Tauri window, loads saved project state from storage

**Node.js / CLI:**
- Location: `packages/cli/src/cli.ts`
- Commands:
  - `rivet run <projectFile> [graphName]` - executes graph, outputs result
  - `rivet serve [projectFile]` - starts REST server, exposes graphs as HTTP endpoints
- Uses `rivet-node` for execution

**Programmatic API:**
- Location: `packages/core/src/api/createProcessor.ts`
- Export: `createProcessor(project, graphId)` → GraphProcessor instance
- Usage: `processor.on('nodeFinish', ...)` → `processor.process(inputs)` → get outputs

**Web Integration:**
- Location: `packages/node/src/api.ts`
- Exposes GraphProcessor interface over HTTP for web-based execution

## Error Handling

**Strategy:** Errors propagate as event data, graph continues unless critical

**Patterns:**
- Node error: emits `nodeError` event, stores in `#erroredNodes`, skips downstream execution
- Graph error: emits `graphError`, throws from `process()` if not caught
- User input timeout: recorded as node error
- Type coercion failure: logs warning, passes value as-is if allowed by node config
- Abort: stores abort reason, emits `graphAbort`, clears pending outputs

## Cross-Cutting Concerns

**Logging:** No centralized logger; uses `console.warn()` for edge cases, relies on GraphProcessor events for instrumentation

**Validation:**
- Nodes validate: input types match definitions, required inputs provided
- Graph validates: no missing node references in connections
- DataValue coercion: `coerceTypeOptional()` attempts type conversion with fallback

**Authentication:**
- Per-integration: OpenAI API key, Anthropic API key, etc. stored in project settings/environment
- `getPluginConfig()` utility retrieves config by key
- CLI supports `.env` for secret management

---

*Architecture analysis: 2026-02-18*
