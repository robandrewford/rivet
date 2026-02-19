# Coding Conventions

**Analysis Date:** 2026-02-18

## Naming Patterns

**Files:**
- Node implementation files: `{NodeType}Node.ts` (e.g., `ChatNode.ts`, `ExtractJsonNode.ts`, `AbortGraphNode.ts`)
- Test files: `{FileName}.test.ts` co-located in `test/` directory structure mirroring `src/`
- Type definitions exported from files alongside implementations
- Utility modules: lowercase with descriptive names (e.g., `expectType.ts`, `errors.ts`, `serialization.ts`)

**Functions:**
- camelCase for function names
- Static factory methods named `create()` on node implementation classes
- Getter methods prefixed with `get` (e.g., `getInputDefinitions()`, `getOutputDefinitions()`, `getEditors()`, `getBody()`, `getUIData()`)
- Boolean predicates use `is` prefix where appropriate (e.g., `isArrayDataType()`, `isFunctionDataType()`, `isScalarDataValue()`)
- Test functions use `it()` and `describe()` from Node's built-in test module

**Variables:**
- camelCase for local variables
- Opaque types from `type-fest` used for strong typing of identifiers (e.g., `NodeId`, `PortId`, `GraphId`, `ProcessId`)
- Constants use UPPERCASE_SNAKE_CASE (example: `IF_PORT`)
- Destructuring preferred for imports and object access

**Types:**
- PascalCase for interface and type names
- Type aliases exported with `export type` keyword
- Implementation classes named `{TypeName}Impl` (e.g., `ExtractJsonNodeImpl`, `ArrayNodeImpl`, `ObjectNodeImpl`)
- Generic type parameters use single uppercase letters: `T` for the main type, `Data` for node data objects
- Union types and discriminated unions use lowercase string literals for type fields (e.g., `type: 'extractJson'`)

## Code Style

**Formatting:**
- Tool: Prettier (configured in `.prettierrc.yml`)
- Single quotes: true
- Trailing commas: all
- Print width: 120 characters

**Linting:**
- Tool: ESLint v9.20.1 with TypeScript support
- Config: Flat config in `eslint.config.mjs` (modern ESLint format)
- Parser: `@typescript-eslint/parser`
- Strict rules enforced:
  - `semi: ['error', 'always']` - Semicolons required
  - `eqeqeq: ['error', 'smart']` - Strict equality
  - `prefer-const: 'error'` - Prefer const over let
  - `@typescript-eslint/no-misused-promises: 'error'` - Catch promise misuse
  - `@typescript-eslint/no-floating-promises: 'error'` - No unhandled promises
  - `@typescript-eslint/consistent-type-imports: ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }]` - Import types with `type` keyword

## Import Organization

**Order:**
1. External packages (e.g., `import { nanoid } from 'nanoid/non-secure'`)
2. Type imports from external packages (e.g., `import type { ChartNode } from '../...'`)
3. Relative imports using explicit `.js` extensions (ESM modules)
4. Type imports from relative paths (e.g., `import type { DataValue } from '../DataValue.js'`)

**Path Aliases:**
- Not used; full relative paths with `.js` extensions preferred
- ESM module system used throughout with explicit file extensions

**Import Style:**
- Type-only imports use `import type` syntax (enforced by ESLint)
- Named imports preferred over default imports
- Inline type modifiers used for mixed imports: `import { foo, type Bar }`

## Error Handling

**Patterns:**
- Try-catch blocks wrap operations that may throw (e.g., `JSON.parse()`, data type checking)
- Unknown error types caught as `unknown` and converted using `getError()` utility
- Errors thrown with descriptive messages including expected vs actual values
- Example from `expectType.ts`: `throw new Error(\`Expected value of type ${type} but got ${value?.type}\`)`
- Validation errors handled early with type checking utilities like `expectType()` and `expectTypeOptional()`

**Error Recovery:**
- Fallback paths provided when parsing fails (e.g., manual JSON extraction after parse attempt fails)
- `getError()` utility used to safely convert unknown errors to Error instances
- Control-flow-excluded type used in output ports when conditions not met (not exceptions)

## Logging

**Framework:** None enforced; implementation-specific

**Patterns:**
- No global logging enforced
- Node implementations can include logging as needed
- Comments used for clarifying complex logic rather than debug logging

## Comments

**When to Comment:**
- Business logic explanations (e.g., "If using a model input, that's priority, otherwise override > main")
- Non-obvious fallback behaviors (e.g., "Fall back to more manual parsing")
- Workarounds or known issues (e.g., "Temporary", "Could be error for some reason")
- Control flow logic in loops and conditionals

**JSDoc/TSDoc:**
- Not systematically used; inline type annotations preferred
- Static `getUIData()` methods return `NodeUIData` with `infoBoxBody`, `infoBoxTitle`, `contextMenuTitle`, `group` properties
- Dedented strings used for multi-line documentation in UI data (via `ts-dedent`)

## Function Design

**Size:** Typically 20-60 lines; larger logic broken into helper functions or extracted to utilities

**Parameters:**
- Typed with full type annotations
- Destructuring used for object parameters where beneficial
- Generic parameters used for type-safe abstractions (e.g., `NodeImpl<T extends ChartNode>`)

**Return Values:**
- Async process functions return `Promise<Record<PortId, DataValue>>` (outputs with port IDs as keys)
- Factory methods return fully typed node instances
- Getter methods return typed definition arrays or objects
- Record types used for flexible key-value collections

## Module Design

**Exports:**
- Type definitions exported with `export type`
- Implementations exported as named exports
- Single class per file typical (e.g., `ExtractJsonNodeImpl` in `ExtractJsonNode.ts`)
- Node definitions created with `nodeDefinition()` helper at end of file

**Barrel Files:**
- Central `index.ts` exports all public types and classes
- Workspace exports managed in `exports.ts` in core package
- Exports include implementations, types, and factory functions

**Node Structure Pattern:**
```typescript
export type ExtractJsonNode = ChartNode<'extractJson', ExtractJsonNodeData>;
export type ExtractJsonNodeData = {}; // Node-specific data

export class ExtractJsonNodeImpl extends NodeImpl<ExtractJsonNode> {
  static create(): ExtractJsonNode { ... }
  getInputDefinitions(): NodeInputDefinition[] { ... }
  getOutputDefinitions(): NodeOutputDefinition[] { ... }
  static getUIData(): NodeUIData { ... }
  async process(inputs: Record<PortId, DataValue>): Promise<Record<PortId, DataValue>> { ... }
}

export const extractJsonNode = nodeDefinition(ExtractJsonNodeImpl, 'Extract JSON');
```

---

*Convention analysis: 2026-02-18*
