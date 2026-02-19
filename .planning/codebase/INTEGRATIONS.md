# External Integrations

**Analysis Date:** 2026-02-18

## APIs & External Services

**LLM Providers:**
- OpenAI - Chat, assistants, file upload, thread management
  - SDK: `openai` 4.28.4
  - Environment: `OPENAI_API_KEY`, `OPENAI_ORG_ID`, `OPENAI_ENDPOINT`
  - Nodes: CreateThreadNode, RunThreadNode, CreateAssistantNode, UploadFileNode
  - Files: `packages/core/src/plugins/openai/`, `packages/core/src/utils/openai.ts`

- Google Generative AI (Vertex AI + GenAI)
  - SDKs: `@google-cloud/vertexai` 0.1.3, `@google/genai` 0.12.0
  - Environment: `GOOGLE_GENERATIVE_AI_API_KEY`
  - Nodes: ChatGoogleNode
  - Files: `packages/core/src/plugins/google/`

- Anthropic - Claude API
  - SDK: Built-in via openai client wrapper with Anthropic support
  - Environment: `ANTHROPIC_API_KEY`
  - Nodes: ChatAnthropicNode
  - Custom streaming: `packages/core/src/plugins/anthropic/fetchEventSource.ts`
  - Files: `packages/core/src/plugins/anthropic/`

- Hugging Face - Model inference
  - SDK: `@huggingface/inference` 2.6.4
  - Environment: API key required (specific name unclear from code)
  - Nodes: ChatHuggingFace, TextToImageHuggingFace
  - Files: `packages/core/src/plugins/huggingface/`

**Speech & Audio:**
- AssemblyAI - Speech-to-text and AI audio processing
  - SDK: `assemblyai` 4.6.0
  - Environment: `ASSEMBLYAI_API_KEY`
  - Nodes: TranscribeAudioNode, LemurSummaryNode, LemurTaskNode, LemurQaNode, LemurActionItemsNode
  - Files: `packages/core/src/plugins/assemblyAi/`

**Vector Search:**
- Pinecone - Vector database for embeddings
  - SDK: Indirect (client details in plugin)
  - Environment: `PINECONE_API_KEY`
  - Files: `packages/core/src/plugins/pinecone/`

**Observability & Tracing:**
- Gentrace - Tracing and observability
  - SDK: `@gentrace/core` 2.2.5
  - Environment: `GENTRACE_API_KEY`
  - Files: `packages/core/src/plugins/gentrace/plugin.ts`

**Evaluation:**
- AutoEvals - LLM evaluation framework
  - SDK: `autoevals` 0.0.26
  - Nodes: AutoEvalsNode
  - Files: `packages/core/src/plugins/autoevals/`

## Data Storage

**Databases:**
- Not built-in to core framework
- Community package uses: Vercel KV (Redis-compatible key-value store)
- Community package can integrate with: MongoDB (via community plugin)
- Reference: `packages/app/src/plugins.ts` lists rivet-plugin-mongodb

**File Storage:**
- Local filesystem - Primary (Tauri fs operations)
- Vercel Blob - Community package file uploads
  - SDK: `@vercel/blob` 0.14.1
  - Deployment integration for community package

**Caching:**
- Vercel KV - Community package
  - SDK: `@vercel/kv` 0.2.4
  - Redis-compatible for session and data caching
- LRU cache - In-memory caching
  - SDK: `lru-cache` 11.0.0

## Authentication & Identity

**Auth Provider (Community Package):**
- NextAuth.js with GitHub OAuth
  - Implementation: `@auth/core` 0.18.0, `next-auth` 5.0.0-beta.3
  - Strategy: Passport local + GitHub OAuth via Octokit
  - Files: `packages/community/src/app/auth/[...nextauth]/route.ts`, `packages/community/src/lib/auth.ts`

**GitHub Integration:**
- Octokit API client
  - SDK: `octokit` 3.1.2
  - Usage: Template sharing, community features
  - Files: `packages/community/src/lib/adapter.ts`, `packages/community/src/app/api/templates/route.ts`

**Tauri App:**
- No built-in auth; uses local settings
- Configuration stored via Tauri fs API

## Monitoring & Observability

**Error Tracking:**
- Not detected in core framework
- Community package would use standard Next.js error handling

**Logs:**
- Console logging (browser and Node.js)
- Gentrace for tracing workflow execution
- Tauri provides event logging via window events

## CI/CD & Deployment

**Hosting & Deployment:**
- **Desktop App:** GitHub Releases
  - Auto-updater endpoint: `https://github.com/Ironclad/rivet/releases/latest/download/latest.json`
  - Tauri updater feature enabled
  - Build workflow: `.github/workflows/release.yml`

- **npm Packages:** npm registry
  - Published packages: rivet-core, rivet-node, rivet-cli, trivet

- **Community Package:** Vercel
  - Next.js deployment target
  - Serverless functions for API routes

**CI Pipeline:**
- GitHub Actions workflows in `.github/workflows/`
  - `build.yml` - Lint, test, build
  - `release.yml` - Release automation
  - `rename-release-assets.yml` - Asset management

**Docker Support:**
- CLI package: Docker publishing script
  - File: `packages/cli/docker-publish.sh`
  - Enables containerized deployment

## Environment Configuration

**Required Environment Variables:**

Core Framework:
- `OPENAI_API_KEY` - OpenAI API authentication
- `OPENAI_ORG_ID` - OpenAI organization (optional)
- `OPENAI_ENDPOINT` - Custom OpenAI endpoint (optional)
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google Generative AI
- `ANTHROPIC_API_KEY` - Anthropic/Claude
- `ASSEMBLYAI_API_KEY` - AssemblyAI speech services
- `PINECONE_API_KEY` - Pinecone vector database
- `GENTRACE_API_KEY` - Gentrace observability

Community Package:
- `VERCEL_BLOB_*` - Vercel Blob storage credentials
- `KV_*` - Vercel KV Redis credentials
- `NEXTAUTH_*` - NextAuth.js configuration
- `GITHUB_*` - GitHub OAuth credentials

**Secrets Location:**
- Environment variables: System environment or .env files (not committed)
- Local app settings: Stored via Tauri fs in user data directory
- Community package: Vercel environment variables dashboard

## Webhooks & Callbacks

**Incoming:**
- Tauri desktop app: No external webhooks (client-side only)
- Community package: GitHub OAuth callbacks via next-auth
- HTTP Call Node: Generic HTTP POST support in workflows
  - File: `packages/core/src/model/nodes/HttpCallNode.js`

**Outgoing:**
- Tauri desktop app: HTTP requests via Tauri shell/API
- HTTP Call Node: Supports arbitrary HTTP methods and webhooks
- Node.js runtime: Full Node.js fetch/http support

## Extension System

**Model Context Protocol (MCP):**
- SDK: `@modelcontextprotocol/sdk` 1.10.2 (rivet-node)
- Enables external tools and prompts
- Nodes: MCPToolCallNode, MCPGetPromptNode, MCPDiscoveryNode
- Files: `packages/core/src/integrations/mcp/`, `packages/node/src/native/NodeMCPProvider.ts`

**Plugin System:**
- Dynamic plugin loading and registration
- Built-in plugins: OpenAI, Anthropic, Google, Hugging Face, AssemblyAI, Pinecone, Gentrace, AutoEvals
- Community plugins (registry in code): MongoDB, Python exec, Oobabooga, ChromaDB, File system
- Plugin interface: `RivetPlugin` with configSpec, contextMenuGroups, register()
- Files: `packages/app/src/plugins.ts`, `packages/core/src/index.ts`

## API Endpoints (Community Package)

**Template Management:**
- `GET /api/templates` - List templates
- `GET /api/templates/[templateId]` - Get template details
- `POST /api/templates` - Create template
- `PATCH /api/templates/[templateId]` - Update template
- `GET /api/templates/[templateId]/version/[version]/screenshots` - Template screenshots
- `GET /api/templates/mine` - User's templates
- `POST /api/templates/[templateId]/star` - Star template

**User Profile:**
- `GET /api/profile` - Get user profile

**Routes:** `packages/community/src/app/api/`

---

*Integration audit: 2026-02-18*
