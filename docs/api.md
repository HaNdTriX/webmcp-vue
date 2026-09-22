# API reference

This package follows the current [WebMCP](https://github.com/webmachinelearning/webmcp) specification. Tools register through `document.modelContext`; clients discover and execute them with `getTools()` and `executeTool()`. `navigator.modelContextTesting` is available only through the development polyfill and is deprecated.

## `<WebMCPProvider>`

Place this provider above every component that calls `useMcpTool()` or `useWebMCPStatus()`.

| Prop | Type | Description |
| --- | --- | --- |
| `name` | `string` | Your application's name. |
| `version` | `string` | Your application's version. |
| `default` slot | `Slot` | Descendant Vue components. |

On client mount, the provider uses native `document.modelContext` when available. Otherwise, it installs an in-memory polyfill and removes it when the final provider unmounts. It is safe to render during SSR because registration only happens after mount.

`useMcpTool()` outside a provider warns in development and does not register a tool unless `document.modelContext` already exists.

## `useWebMCPStatus()`

Returns the WebMCP availability state:

```ts
const { available } = useWebMCPStatus()
```

| Field | Type | Description |
| --- | --- | --- |
| `available` | `Readonly<Ref<boolean>>` | `true` once `document.modelContext` is ready; `false` during SSR and outside a provider. |

## `useMcpTool(config)`

Registers a tool while the calling component is mounted. The tool unregisters when that component unmounts. Pass a Vue `reactive()` config to update its registration when its name, metadata, schemas, annotations, or `exposedTo` value changes.

```ts
const { state, execute, reset } = useMcpTool({
  name: 'greet',
  description: 'Greet a person.',
  input: z.object({ name: z.string() }),
  handler: async ({ name }, { signal }) => ({
    content: [{ type: 'text', text: `Hello ${name}` }],
  }),
})
```

| Field | Type | Description |
| --- | --- | --- |
| `name` | `string` | Required unique identifier: 1-128 characters matching `^[A-Za-z0-9_.-]+$`. |
| `title` | `string` | Optional human-readable display title. |
| `description` | `string` | Required explanation for clients. |
| `input` | `StandardSchemaV1` | Standard Schema validator for inputs; the handler receives its parsed, inferred output. |
| `output` | `StandardSchemaV1` | Optional Standard Schema validator whose JSON Schema is exposed as the output schema. |
| `inputSchema` | `InputSchema` | Raw JSON Schema for inputs, used instead of `input`. |
| `outputSchema` | `InputSchema` | Raw JSON Schema for outputs, used instead of `output`. |
| `annotations` | `ToolAnnotations` | Optional hints: `readOnlyHint` and `untrustedContentHint`. |
| `exposedTo` | `string[]` | Potentially trustworthy origins allowed to access the tool across frames. |
| `handler` | `(args, ctx) => CallToolResult \| Promise<CallToolResult>` | Tool implementation. `ctx.signal` aborts when the caller cancels. |
| `onSuccess` | `(result: CallToolResult) => void` | Optional callback after a successful execution. |
| `onError` | `(error: Error) => void` | Optional callback after a validation, handler, or registration error. |

Use either `input`/`output` or `inputSchema`/`outputSchema`, never both. Standard Schema validation occurs before the handler. Raw JSON Schema is exposed to clients but is not validated by this package; validate untrusted input in the handler or use a Standard Schema validator.

`ToolAnnotations` supports only these WebMCP fields:

```ts
interface ToolAnnotations {
  readOnlyHint?: boolean
  untrustedContentHint?: boolean
}
```

Use the top-level `title` field for a display title. Classic MCP hints such as `destructiveHint`, `idempotentHint`, and `openWorldHint` are not WebMCP fields.

### Return value

| Field | Type | Description |
| --- | --- | --- |
| `state.isExecuting` | `boolean` | `true` while one or more executions are active. |
| `state.lastResult` | `CallToolResult \| null` | Most recent successful result. |
| `state.error` | `Error \| null` | Most recent validation, handler, or registration error. |
| `state.executionCount` | `number` | Successful executions since the last reset. |
| `execute(input?, { signal }?)` | `(input?, options?) => Promise<CallToolResult>` | Executes the tool locally. |
| `reset()` | `() => void` | Restores the execution state to its initial values. |

`execute()` rejects on validation and handler errors. Agent-initiated executions instead return `{ content, isError: true }`. Both paths update the same reactive state and call the same callbacks. An aborted execution clears `isExecuting` but does not update `state.error` or call `onError`.

Handlers must return:

```ts
interface CallToolResult {
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
    | { type: 'resource'; resource: { uri: string; mimeType?: string; text?: string; blob?: string } }
    | { type: 'resource_link'; uri: string; name?: string; description?: string; mimeType?: string }
  >
  structuredContent?: Record<string, unknown>
  isError?: boolean
}
```

## Consumer API and polyfill

When the browser lacks native WebMCP, `WebMCPProvider` exposes the following in-memory APIs:

```ts
const tools = await document.modelContext?.getTools()
const result = await document.modelContext?.executeTool(tools![0], { query: 'Vue' })
```

- `document.modelContext` is an `EventTarget` with `registerTool()`, `getTools()`, and `executeTool()`. It fires `toolchange` whenever tools register or unregister.
- `getTools()` returns tools sorted by name and copies each exposed `inputSchema`.
- `executeTool()` accepts an object. The polyfill also accepts JSON strings for compatibility; prefer objects in new code.
- `navigator.modelContextTesting` is a deprecated wrapper over the same polyfill engine. Use `document.modelContext.getTools()` and `executeTool()` instead.

The polyfill serializes object inputs before invoking a tool, so handlers receive an independent JSON-compatible copy. It rejects invalid or non-object inputs and propagates cancellation through the handler's `AbortSignal`.
