# Codebase Structure

**Analysis Date:** 2026-02-18

## Directory Layout

```
rivet/
├── packages/                              # Monorepo workspace
│   ├── core/                              # Core execution engine (NPM: @ironclad/rivet-core)
│   │   ├── src/
│   │   │   ├── api/                       # Public API (createProcessor, streaming)
│   │   │   ├── model/                     # Type definitions and core abstractions
│   │   │   │   ├── nodes/                 # Built-in node implementations (86+ files)
│   │   │   │   ├── GraphProcessor.ts      # Main execution orchestrator (67K lines)
│   │   │   │   ├── DataValue.ts           # Type-safe data values
│   │   │   │   ├── NodeBase.ts            # Node structure interface
│   │   │   │   ├── NodeImpl.ts             # Node execution contract
│   │   │   │   ├── NodeGraph.ts           # Graph structure
│   │   │   │   ├── Nodes.ts               # Node registry
│   │   │   │   ├── ProcessContext.ts      # Execution context
│   │   │   │   └── Project.ts             # Project structure
│   │   │   ├── integrations/              # External service integrations
│   │   │   │   ├── VectorDatabase.ts      # Vector DB interface
│   │   │   │   ├── LLMProvider.ts         # LLM provider interface
│   │   │   │   ├── EmbeddingGenerator.ts  # Embedding interface
│   │   │   │   ├── MCPProvider.ts         # Model Context Protocol
│   │   │   │   ├── DatasetProvider.ts     # Dataset storage interface
│   │   │   │   └── CodeRunner.ts          # Code execution integration
│   │   │   ├── plugins/                   # Plugin modules
│   │   │   │   ├── anthropic/             # Anthropic Claude integration
│   │   │   │   ├── google/                # Google Vertex/Gemini integration
│   │   │   │   ├── openai/                # (built-in, not here)
│   │   │   │   ├── pinecone/              # Pinecone vector DB
│   │   │   │   ├── assemblyai/            # AssemblyAI audio/transcription
│   │   │   │   ├── huggingface/           # HuggingFace inference
│   │   │   │   ├── autoevals/             # AutoEvals evaluation
│   │   │   │   └── gentrace/              # Gentrace integration
│   │   │   ├── utils/                     # Shared utilities (serialization, type coercion, etc.)
│   │   │   ├── native/                    # Platform-specific APIs (BaseDir, NativeApi)
│   │   │   ├── recording/                 # Execution recording interface
│   │   │   ├── exports.ts                 # Public exports barrel file
│   │   │   └── index.ts                   # Entry point
│   │   ├── dist/                          # Build output (esm, cjs, types)
│   │   ├── package.json                   # npm package config
│   │   └── tsconfig.json                  # TypeScript config
│   │
│   ├── app/                               # Desktop application (React + Tauri)
│   │   ├── src/
│   │   │   ├── components/                # React UI components
│   │   │   │   ├── RivetAppLoader.tsx     # Main component tree
│   │   │   │   ├── ActionBar.tsx          # Top toolbar
│   │   │   │   ├── NavigationBar.tsx      # Left navbar
│   │   │   │   ├── GraphList.tsx          # Graph sidebar
│   │   │   │   ├── GraphBuilder.tsx       # Canvas/editor area
│   │   │   │   ├── nodes/                 # Node UI components
│   │   │   │   ├── editors/               # Node property editors
│   │   │   │   ├── dataStudio/            # Dataset management UI
│   │   │   │   ├── trivet/                # Test framework UI
│   │   │   │   └── community/             # Community features
│   │   │   ├── state/                     # Zustand state stores
│   │   │   │   ├── graph.ts               # Graph editing state
│   │   │   │   ├── execution.ts           # Execution state
│   │   │   │   ├── savedGraphs.ts         # Saved projects
│   │   │   │   ├── settings.ts            # User settings
│   │   │   │   ├── dataFlow.ts            # Data flow visualization state
│   │   │   │   ├── storage.ts             # Persistence layer
│   │   │   │   ├── userInput.ts           # User input prompts
│   │   │   │   ├── plugins.ts             # Plugin state
│   │   │   │   ├── trivet.ts              # Testing state
│   │   │   │   └── dataStudio.ts          # Dataset state
│   │   │   ├── hooks/                     # React custom hooks (89+ files)
│   │   │   ├── utils/                     # App utilities (22+ files)
│   │   │   ├── commands/                  # Command/action handlers
│   │   │   ├── io/                        # File I/O, project loading
│   │   │   ├── model/                     # App-specific models
│   │   │   ├── assets/                    # Images, icons
│   │   │   ├── index.css                  # Global styles
│   │   │   ├── colors.css                 # Color palette
│   │   │   ├── index.tsx                  # React DOM root
│   │   │   ├── App.tsx                    # Root component
│   │   │   └── plugins.ts                 # Plugin loading
│   │   ├── src-tauri/                     # Tauri backend (Rust)
│   │   │   └── src/                       # Rust source files
│   │   ├── vite.config.ts                 # Vite bundler config
│   │   └── package.json                   # npm config
│   │
│   ├── node/                              # Node.js runtime (NPM: @ironclad/rivet-node)
│   │   ├── src/
│   │   │   ├── api.ts                     # Node.js API surface
│   │   │   ├── debugger.ts                # Debugger support
│   │   │   ├── index.ts                   # Entry point
│   │   │   └── native/                    # Node-specific native bindings
│   │   └── package.json                   # npm config
│   │
│   ├── cli/                               # Command-line tool (NPM: @ironclad/rivet-cli)
│   │   ├── src/
│   │   │   ├── cli.ts                     # CLI entry point, yargs setup
│   │   │   └── commands/
│   │   │       ├── run.ts                 # `rivet run` - execute graph
│   │   │       └── serve.ts               # `rivet serve` - REST API server
│   │   └── package.json                   # npm config
│   │
│   ├── docs/                              # Documentation website
│   ├── community/                         # Community integration
│   ├── trivet/                            # Test framework
│   └── app-executor/                      # Binary executor (build artifact)
│
├── .github/                               # GitHub Actions workflows
├── examples/                              # Example projects
├── .planning/                             # GSD planning directory
├── package.json                           # Root workspace config (yarn@4.6.0)
├── eslint.config.mjs                      # ESLint config
├── .prettierrc.yml                        # Prettier format config
├── tsconfig.json                          # Root TypeScript config
└── README.md                              # Project overview
```

## Directory Purposes

**packages/core/src/model/:**
- Core data structures for graph computation
- `GraphProcessor.ts`: main execution loop, node orchestration, state management
- `NodeBase.ts`: node interface (id, type, title, inputs, outputs, connections)
- `DataValue.ts`: typed data values (string, number, boolean, object, array, chat messages)
- `nodes/`: 86+ built-in node implementations (ChatNodeBase, CodeNode, HttpCallNode, etc.)
- `Nodes.ts`: global registry mapping node types to implementations

**packages/core/src/integrations/:**
- Abstractions for external services
- `LLMProvider.ts`, `VectorDatabase.ts`, `EmbeddingGenerator.ts`: interfaces
- `enableIntegrations.ts`: dependency injection setup
- `CodeRunner.ts`: sandboxed code execution

**packages/core/src/plugins/:**
- Plugin implementations (one folder per plugin)
- Each contains: plugin.ts (registration), index.ts (exports), node files
- Examples: ChatAnthropicNode, ChatGoogleNode, PineconeVectorDatabase

**packages/core/src/utils/:**
- Shared utilities: type coercion, serialization, string interpolation
- `openai.ts`: OpenAI-specific helpers
- `serialization/`: JSON/YAML parsing
- `coerceType.ts`: type conversion logic

**packages/app/src/state/:**
- Zustand stores managing UI and execution state
- `graph.ts`: current graph editing state
- `savedGraphs.ts`: project persistence
- `execution.ts`: running graphs, node results
- `storage.ts`: localStorage persistence layer

**packages/app/src/hooks/:**
- React custom hooks for graph interaction
- Pattern: `useX` naming (useGraph, useExecution, etc.)
- Handle side effects, event subscriptions, keyboard shortcuts

**packages/app/src/components/nodes/:**
- React components rendering individual node types in the UI
- Organized by category or plugin
- Bind to Zustand state, dispatch actions on input change

## Key File Locations

**Entry Points:**

- `packages/core/src/index.ts`: Rivet core library exports
- `packages/app/src/index.tsx`: Desktop app React DOM root
- `packages/node/src/index.ts`: Node.js runtime exports
- `packages/cli/src/cli.ts`: CLI command dispatcher

**Configuration:**

- `packages/core/package.json`: npm package metadata, build scripts
- `packages/app/src/plugins.ts`: Desktop app plugin loader
- `packages/core/src/model/Nodes.ts`: Built-in node registry
- `eslint.config.mjs`: Shared linting rules

**Core Logic:**

- `packages/core/src/model/GraphProcessor.ts`: Graph execution orchestrator
- `packages/core/src/model/DataValue.ts`: Data type system
- `packages/core/src/model/nodes/`: Built-in node implementations

**Testing:**

- `packages/core/test/`: Unit tests (via tsx --test)
- `packages/core/src/model/nodes/*.test.ts`: Per-node tests

**Utilities:**

- `packages/core/src/utils/`: Shared helpers (coerceType, serialization, etc.)
- `packages/app/src/utils/`: App-specific helpers (formatting, clipboard, etc.)

## Naming Conventions

**Files:**
- Classes: PascalCase (ChatNodeBase.ts, GraphProcessor.ts)
- Functions/utilities: camelCase (coerceType.ts, getPluginConfig.ts)
- Types only: lowercase with extensions (.d.ts if needed)
- Test files: `{name}.test.ts` suffix
- Node implementations: `{NodeName}Node.ts` (ChatNode.ts, HttpCallNode.ts)

**Directories:**
- Feature/domain: lowercase plural or singular domain (utils/, hooks/, components/)
- Package: lowercase with hyphens (app, core, cli)
- Organizational: by concern (model/, plugins/, integrations/)

**Variables/Functions:**
- Camelcase for functions: `processGraph()`, `getInputDefinitions()`
- Private members: `#fieldName` (TypeScript private field syntax)
- Constants: UPPER_SNAKE_CASE
- React hooks: `useXxx` pattern
- State slices: descriptive names (graph, execution, savedGraphs)

**Types:**
- Interfaces: PascalCase (NodeBase, ChartNode, DataValue)
- Opaque types: `type NodeId = Opaque<string, 'NodeId'>`
- Union discriminants: `type: 'string'` for tagged unions
- Generic type params: Single letters (T, K, V) or descriptive (T extends ChartNode)

## Where to Add New Code

**New Built-in Node:**
- Implementation: `packages/core/src/model/nodes/MyNewNode.ts`
  - Extend NodeImpl, implement getInputDefinitions, getOutputDefinitions, process
  - Register in `packages/core/src/model/Nodes.ts` globalRivetNodeRegistry
- Tests: `packages/core/test/MyNewNode.test.ts`
- UI (if needed): `packages/app/src/components/nodes/MyNewNodeEditor.tsx`

**New Integration (LLM, Vector DB, etc.):**
- Interface: Define in `packages/core/src/integrations/` or extend existing
- Implementation:
  - Plugin folder: `packages/core/src/plugins/myservice/`
  - Files: `plugin.ts` (register), `MyServiceNode.ts` (node impl), `index.ts` (exports)
- Nodes: Create node files for each operation (ChatMyServiceNode.ts, EmbedMyServiceNode.ts)
- Tests: `packages/core/test/plugins/myservice/`

**New CLI Command:**
- Implementation: `packages/cli/src/commands/mycommand.ts`
- Export: `makeCommand()` and main handler function
- Register: Add to yargs in `packages/cli/src/cli.ts`

**New App Feature:**
- UI Components: `packages/app/src/components/{feature}/`
- State: `packages/app/src/state/{feature}.ts` (Zustand store)
- Hooks: `packages/app/src/hooks/use{Feature}.ts` for complex logic
- Utilities: `packages/app/src/utils/{feature}/` if needed

**Utilities:**
- Shared (used by multiple packages): `packages/core/src/utils/`
- App-only: `packages/app/src/utils/`
- Node runtime: `packages/node/src/`

## Special Directories

**packages/core/src/native/:**
- Purpose: Platform-specific APIs (filesystem access, environment)
- Generated: No
- Committed: Yes
- Contains: BaseDir.ts (directory resolution), NativeApi.ts (abstraction), BrowserNativeApi.ts (web stub)

**packages/core/dist/:**
- Purpose: Compiled output from TypeScript
- Generated: Yes (via `yarn build`)
- Committed: No (in .gitignore)
- Contents: esm/, cjs/, types/ subdirectories

**packages/app/src-tauri/:**
- Purpose: Tauri backend (Rust), enables native desktop capabilities
- Generated: No
- Committed: Yes
- Compiled separately via Tauri build system

**.planning/:**
- Purpose: GSD planning artifacts
- Generated: Yes (by GSD commands)
- Committed: No (per .gitignore)
- Subdirectories: phases/, todos/, codebase/

## Build & Distribution

**Package Outputs:**
- `@ironclad/rivet-core`: npm package, dual ESM + CJS
- `@ironclad/rivet-node`: npm package (Node.js runtime)
- `@ironclad/rivet-cli`: npm package (CLI tool)
- Desktop app: Tauri binaries (macOS .dmg, Linux .AppImage, Windows .exe)

**Build Config:**
- TypeScript: tsconfig.json per package
- Bundler: esbuild for rivet-core CJS, tsc for ESM
- App bundler: Vite (packages/app/vite.config.ts)

---

*Structure analysis: 2026-02-18*
