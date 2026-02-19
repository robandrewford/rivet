# Testing Patterns

**Analysis Date:** 2026-02-18

## Test Framework

**Runner:**
- Node.js built-in `test` module (Node v18+)
- Run via `tsx --test test/**/*.test.ts` (from `packages/core/package.json`)
- No external test runner required (Jest, Vitest not used in core package)

**Assertion Library:**
- Node.js built-in `strict` assertion module (`import { strict as assert } from 'node:assert'`)
- Assertions: `assert.strictEqual()`, `assert.notStrictEqual()`, `assert.deepEqual()`, `assert.deepStrictEqual()`, `assert.ok()`

**Mocking:**
- Node.js built-in `mock` from `node:test` module
- Example: `import { mock } from 'node:test'`
- Create mocks: `mock.fn(callableFunction)` returns function with `.mock.calls` array tracking

**Run Commands:**
```bash
yarn test                    # Run all tests in core package
npm run test                 # Alternative via npm
tsx --test test/**/*.test.ts # Direct invocation
```

## Test File Organization

**Location:**
- Co-located with source code structure: `test/` mirrors `src/` directory layout
- Examples:
  - `test/model/nodes/ExtractJsonNode.test.ts` → `src/model/nodes/ExtractJsonNode.ts`
  - `test/recording/ExecutionRecorder.test.ts` → `src/recording/ExecutionRecorder.ts`
  - `test/model/GraphProcessor.test.ts` → `src/model/GraphProcessor.ts`

**Naming:**
- Pattern: `{FileName}.test.ts`
- All test files use `.test.ts` suffix

**Structure:**
```
packages/core/
├── src/
│   └── model/
│       └── nodes/
│           └── ExtractJsonNode.ts
├── test/
│   └── model/
│       └── nodes/
│           └── ExtractJsonNode.test.ts
└── testUtils.ts (shared test utilities)
```

## Test Structure

**Suite Organization:**
```typescript
import { it, describe } from 'node:test';
import { strict as assert } from 'node:assert';

describe('ExtractJsonNodeImpl', () => {
  it('can create node', () => {
    const node = ExtractJsonNodeImpl.create();
    assert.strictEqual(node.type, 'extractJson');
  });

  it('processes valid object JSON input correctly', async () => {
    const node = createNode();
    const inputs = {
      input: { type: 'string', value: '{"key": "value"}' },
    };
    const result = await node.process(inputs);
    assert.deepStrictEqual(result['output'].value, { key: 'value' });
    assert.strictEqual(result['noMatch'].type, 'control-flow-excluded');
  });
});
```

**Patterns:**
- `describe()` wraps related test cases (one per test file typically)
- `it()` defines individual test cases with descriptive names
- Test names describe behavior: "can create node", "processes valid JSON input correctly", "creates nodes with unique IDs"
- Async tests marked with `async` keyword in `it()` callback
- Assertions placed at end of test (arrange-act-assert pattern)

**Setup Pattern:**
- Shared node creation utility at top of file:
```typescript
const createNode = (data: Partial<ArrayNode['data']>) => {
  return new ArrayNodeImpl({
    ...ArrayNodeImpl.create(),
    data: {
      ...ArrayNodeImpl.create().data,
      ...data,
    },
  });
};
```
- Allows reuse of configured nodes across multiple tests
- Factory methods like `create()` used for baseline instances

**Teardown Pattern:**
- No explicit teardown used; tests are isolated by default
- Mock functions cleaned up automatically between tests
- Process context created fresh for each test

**Assertion Pattern:**
- `assert.strictEqual(actual, expected)` for simple value comparisons
- `assert.notStrictEqual(actual, expected)` for inequality checks
- `assert.deepStrictEqual(actual, expected)` for object/array deep equality
- `assert.ok(value)` for truthy checks
- Multiple assertions per test common (verifying all output ports)

## Mocking

**Framework:** Node.js built-in `mock` from `node:test`

**Patterns:**
```typescript
import { mock } from 'node:test';

it('processes successfully abort', async () => {
  const abortGraph = mock.fn((_error?: Error | string) => {});
  const context = { abortGraph: abortGraph as () => void } as InternalProcessContext;
  const result = await node.process({}, context);

  assert.strictEqual(abortGraph.mock.calls.length, 1);
  assert.strictEqual(abortGraph.mock.calls[0]!.arguments[0]!, undefined);
});
```

**Mock Tracking:**
- Mock function has `.mock.calls` array: list of call arguments
- Access arguments: `abortGraph.mock.calls[0]!.arguments[0]!`
- Check call count: `abortGraph.mock.calls.length`
- Mock functions can be typed with `as` assertions when needed

**What to Mock:**
- External function callbacks (e.g., `abortGraph` callback in context)
- Integration points: `InternalProcessContext` methods and providers
- Side-effect functions that should be verified as called

**What NOT to Mock:**
- Pure node logic (process() implementations should run real code)
- Data structures and types (use real instances)
- Helper utilities like `nanoid()`, `expectType()` (let them run)
- Built-in modules like `JSON.parse()`

## Fixtures and Factories

**Test Data:**
- Inline fixture creation via helper functions (`createNode()`)
- Data fixtures defined as function parameters:
```typescript
const node = createNode({ flatten: true, flattenDeep: false });
```
- Input ports created as inline objects:
```typescript
const inputs = {
  input: { type: 'string', value: '{"key": "value"}' },
};
```

**Location:**
- No dedicated fixture directory
- Fixtures created inline in test files where needed
- Shared fixtures (like `testProcessContext()`) in `testUtils.ts`
- Test graphs loaded from `test-graphs.rivet-project` file

**Test Utilities in `testUtils.ts`:**
```typescript
export function testProcessContext(): ProcessContext {
  return {
    settings: {
      openAiKey: process.env.OPENAI_API_KEY,
      openAiOrganization: process.env.OPENAI_ORG_ID,
      openAiEndpoint: process.env.OPENAI_API_ENDPOINT,
    },
  };
}

export async function loadTestGraphInProcessor(graphName: string) {
  const project = await loadTestGraphs();
  const graph = Object.values(project.graphs).find((g) => g.metadata!.name === graphName);
  if (!graph) {
    throw new Error(`Could not find graph with name ${graphName}`);
  }
  return new GraphProcessor(project, graph.metadata!.id!);
}
```

## Coverage

**Requirements:** Not enforced; no coverage configuration in package.json

**View Coverage:** No coverage tooling configured

**Testing Philosophy:** Tests written for substantive logic (node processing, data transformations), not framework integration.

## Test Types

**Unit Tests:**
- Scope: Individual node implementations and utilities
- Approach: Direct instantiation of classes, calling methods with test data
- Example: `ExtractJsonNodeImpl.test.ts` tests JSON parsing logic directly
- No graph execution context required
- Verify input/output definitions, process logic, node creation

**Integration Tests:**
- Scope: Graph processor with loaded test graphs
- Approach: Load test project, instantiate `GraphProcessor`, call `processGraph()`
- Example: `GraphProcessor.test.ts` loads 'Passthrough' graph and verifies event streams
- Uses `testProcessContext()` for configuration
- Verifies end-to-end graph execution

**E2E Tests:**
- Framework: Not used
- No browser or end-to-end tests in core package
- E2E testing likely delegated to other packages (app, node, etc.)

## Common Patterns

**Async Testing:**
```typescript
it('processes valid JSON input correctly', async () => {
  const node = createNode();
  const inputs = { input: { type: 'string', value: '{"key": "value"}' } };
  const result = await node.process(inputs);
  assert.deepStrictEqual(result['output'].value, { key: 'value' });
});
```
- Mark `it()` callback as `async`
- `await` the async function call
- Assertions proceed normally

**Error Testing:**
```typescript
it('processes invalid JSON input correctly', async () => {
  const node = createNode();
  const inputs = { input: { type: 'string', value: 'invalid' } };
  const result = await node.process(inputs);
  assert.strictEqual(result['output'].type, 'control-flow-excluded');
  assert.strictEqual(result['noMatch'].value, 'invalid');
});
```
- Error outcomes represented as alternate output ports (control-flow design)
- No exceptions expected; logic handles errors and routes to different outputs
- Verify error output port has expected data type and value

**Streaming/Event Testing:**
```typescript
it('Can stream graph processor events', async () => {
  const processor = await loadTestGraphInProcessor('Passthrough');

  processor.processGraph(testProcessContext(), {
    input: { type: 'string', value: 'input value' },
  });

  const eventNames: string[] = [];
  for await (const event of processor.events()) {
    if (event.type !== 'trace') {
      eventNames.push(event.type);
    }
  }

  assert.equal(eventNames[eventNames.length - 2], 'done');
  assert.equal(eventNames[eventNames.length - 1], 'finish');
});
```
- Use `for await...of` to consume event streams
- Filter events as needed (e.g., skip 'trace' events)
- Verify event sequence by checking event types

---

*Testing analysis: 2026-02-18*
