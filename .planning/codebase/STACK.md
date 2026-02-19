# Technology Stack

**Analysis Date:** 2026-02-18

## Languages

**Primary:**
- TypeScript 5.7.3 - Core framework, all packages, and tooling
- Rust 1.59+ - Desktop application via Tauri backend
- Python 3.13 - Development environment support (optional)

**Secondary:**
- JavaScript - ES module transpilation and bundle outputs
- YAML - Configuration files (prettier, next, tauri)

## Runtime

**Environment:**
- Node.js 20.4.0 (pinned via Volta)
- Yarn 4.6.0 (package manager, uses Yarn workspaces)
- Cargo (Rust package manager for Tauri app)

**Package Manager:**
- Yarn 4.6.0 with PnP (Plug'n'Play) - see `.pnp.cjs` and `.pnp.loader.mjs`
- Lockfile: `yarn.lock` (present)
- Workspace structure: `packages/*` monorepo with 8 packages

## Frameworks

**Core Runtime:**
- Tauri 1.8.2 - Desktop application framework (Rust backend + web frontend)
  - Features: process-relaunch, shell-execute, http-all, path-all, updater, shell-open, dialog-all, fs-all, global-shortcut-all, shell-sidecar, window-all, devtools
  - Plugins: tauri-plugin-persisted-scope, tauri-plugin-window-state

**Frontend:**
- React 18.2.0 - UI framework for Tauri desktop app
- Vite 6.1.0 - Build tool and dev server
- Next.js 15.1.7 - Web framework for community package (SSR/SSG)

**Web Server:**
- Hono 4.7.0 - Lightweight web framework for CLI server
- next-connect 1.0.0-next.4 - Express-like middleware for Next.js

**Testing:**
- tsx --test - Node native test runner (TypeScript files)
- Jest for configuration resolution (jest-diff, jest-mock for utilities)

**Build/Dev:**
- TSC (TypeScript Compiler) - Type checking and ESM/CJS builds
- esbuild 0.19.5 - Fast bundler for CommonJS output
- rollup 4.34.6 - Module bundler with visualization
- SWC (@swc/core 1.3.94) - TypeScript/JavaScript compiler (faster alternative to Babel)

## Key Dependencies

**Critical - LLM & AI:**
- openai 4.28.4 - OpenAI API client (chat, assistants, files, threads)
- @google-cloud/vertexai 0.1.3 - Google Vertex AI
- @google/genai 0.12.0 - Google GenAI
- @huggingface/inference 2.6.4 - Hugging Face model inference
- assemblyai 4.6.0 - Speech-to-text and AI processing
- autoevals 0.0.26 - Evaluation framework

**Infrastructure & Integration:**
- @modelcontextprotocol/sdk 1.10.2 - Model Context Protocol for extensibility
- @gentrace/core 2.2.5 - Trace and observability
- ws 8.18.0 - WebSocket client/server
- emittery 1.0.1, emittery-0-13 - Event emitter utilities

**Authentication (Community package):**
- @auth/core 0.18.0 - Core auth library
- next-auth 5.0.0-beta.3 - Session management for Next.js
- passport-local 1.0.0 - Local authentication strategy
- octokit 3.1.2 - GitHub API client

**State Management:**
- jotai 2.11.0 - Primitive state management (app)
- @recoiljs/refine 0.1.1 - Recoil state management (app and community)
- immer 10.0.3 - Immutable state updates

**Data Processing:**
- jsonpath-plus 10.2.0 - JSONPath query support
- lodash-es 4.17.21 - Utility library
- yaml 2.3.3 - YAML parsing and serialization
- marked 9.1.2 - Markdown parser
- csv-parse 5.5.2, csv-stringify 6.4.4 - CSV processing
- minimatch 9.0.3 - Glob pattern matching

**Query & Async:**
- @tanstack/react-query 5.4.3 - Server state management for React
- p-queue 7.4.1, p-queue-6 - Promise queue management
- p-retry 6.1.0, p-retry-4 - Retry utility with multiple versions

**UI Components & Styling:**
- @atlaskit/* (various versions) - Atlassian UI components
- @dnd-kit/core 6.0.8, @dnd-kit/sortable 7.0.2 - Drag-and-drop
- react-dnd 16.0.1 - Alternative drag-and-drop
- @emotion/react 11.11.1, @emotion/styled 11.11.0 - CSS-in-JS
- react-select 5.7.7 - Dropdown selection
- react-toastify 9.1.3 - Toast notifications
- react-window 1.8.9 - Virtual scrolling
- monaco-editor 0.44.0 - Code editor

**Storage & File Operations:**
- @vercel/blob 0.14.1 - Blob storage for community package
- @vercel/kv 0.2.4 - Key-value store for community package
- mime 4.0.4 - MIME type detection
- tar 0.4.40, flate2 1.0.27 - Archive handling (Rust/Tauri)

**Utilities & Helpers:**
- gpt-tokenizer 2.1.2 - OpenAI token counting
- safe-stable-stringify 2.4.3 - Deterministic JSON serialization
- ts-pattern 5.6.2 - Pattern matching
- type-fest 4.34.1 - TypeScript type utilities
- nanoid 3.3.6 - ID generation
- cron-parser 4.9.0 - Cron expression parsing
- crypto-js 4.2.0 - Cryptographic utilities

## Configuration

**TypeScript:**
- `tsconfig.json` - Individual configs per package
- Strict mode enabled
- ESM as default module format

**Prettier:**
- Config: `.prettierrc.yml`
- Settings: singleQuote: true, trailingComma: all, printWidth: 120

**ESLint:**
- Config: `eslint.config.mjs` (ESLint v9 flat config)
- Extensions: @typescript-eslint, eslint-plugin-react, eslint-plugin-import, etc.
- Base config: eslint-config-standard-with-typescript

**Vite:**
- Config: `packages/app/vite.config.ts`
- Plugins: @vitejs/plugin-react, vite-plugin-monaco-editor, vite-plugin-svgr, vite-plugin-top-level-await, vite-tsconfig-paths

**Tauri:**
- Config: `packages/app/src-tauri/Cargo.toml`
- Desktop app built with Tauri framework
- Release notes: GitHub releases integration for auto-updates

**Next.js:**
- Community package uses Next.js 15.1.7
- API routes for backend services

**Environment:**
- Volta pinning: Node 20.4.0, Yarn 4.6.0 (see root `package.json`)
- No .env files committed; configuration via environment variables

## Workspaces

**@ironclad/rivet-core** `packages/core/`
- Main execution engine and plugin system
- LLM integrations, node types, recording
- Published to npm

**@ironclad/rivet-app** `packages/app/`
- Tauri desktop application
- React UI with Monaco editor
- Tauri backend in Rust

**@ironclad/rivet-node** `packages/node/`
- Node.js runtime adapter
- MCP (Model Context Protocol) SDK integration
- Published to npm

**@ironclad/rivet-cli** `packages/cli/`
- Command-line interface
- Hono server for programmatic access
- Published to npm

**@ironclad/rivet-app-executor** `packages/app-executor/`
- Standalone executor for workflows
- Bundled as single executable

**@ironclad/trivet** `packages/trivet/`
- Testing and validation library
- Published to npm

**@ironclad/rivet-community** `packages/community/`
- Community template sharing platform
- Next.js application with auth and storage

**docs** `packages/docs/`
- Docusaurus 2.4.3 documentation site
- Published to hosted documentation

## Platform Requirements

**Development:**
- macOS or Linux (Tauri dev workflow)
- Node.js 20.4.0
- Rust toolchain (for Tauri desktop app)
- Optional: Python 3.13 for development scripts

**Production:**
- Desktop: macOS, Windows, Linux (Tauri-compiled binaries)
- Web: Node.js 18.0.0+ (CLI)
- Browser: Modern browsers with ES2020+ support
- Community package: Node.js 18.0.0+, deployment on Vercel

**Deployment:**
- Tauri app: GitHub Releases for distribution
- npm packages: npm registry
- Documentation: Static hosting (Docusaurus output)
- Community site: Vercel serverless deployment

---

*Stack analysis: 2026-02-18*
