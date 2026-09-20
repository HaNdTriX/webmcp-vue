# webmcp-vue

[![npm version](https://img.shields.io/npm/v/webmcp-vue)](https://www.npmjs.com/package/webmcp-vue)
[![npm downloads](https://img.shields.io/npm/dm/webmcp-vue)](https://www.npmjs.com/package/webmcp-vue)
[![license](https://img.shields.io/github/license/HaNdTriX/webmcp-vue)](./LICENSE)
![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)

Vue 3 composables for exposing typed, callable tools on `document.modelContext`, aligned with [WebMCP](https://github.com/webmachinelearning/webmcp).

Inspired by and ported from [agentcathq/webmcp-react](https://github.com/agentcathq/webmcp-react).

## Requirements

- Vue 3
- A browser that supports WebMCP, or the built-in development polyfill
- Optionally, a [Standard Schema](https://standardschema.dev)-compatible validator such as Zod, Valibot, or ArkType

## Install

```bash
pnpm add webmcp-vue zod
```

Zod is optional. Install only the Standard Schema-compatible validator you want to use, or use JSON Schema directly.

## Quick start

Wrap the part of the application that declares tools with `WebMCPProvider`, then call `useMcpTool` in a descendant component.

```vue
<!-- App.vue -->
<script setup lang="ts">
import { WebMCPProvider } from 'webmcp-vue'
import SearchTool from './SearchTool.vue'
</script>

<template>
  <WebMCPProvider name="my-app" version="1.0">
    <SearchTool />
    <RouterView />
  </WebMCPProvider>
</template>
```

```vue
<!-- SearchTool.vue -->
<script setup lang="ts">
import { useMcpTool } from 'webmcp-vue'
import { z } from 'zod'

useMcpTool({
  name: 'search',
  title: 'Search catalog',
  description: 'Search the product catalog by query.',
  input: z.object({ query: z.string() }),
  annotations: { readOnlyHint: true },
  handler: async ({ query }, { signal }) => {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal })
    const products = await response.json()

    return {
      content: [{ type: 'text', text: JSON.stringify(products) }],
    }
  },
})
</script>

<template>
  <slot />
</template>
```

The tool is registered while `SearchTool` is mounted and is removed when it unmounts. Agents discover and invoke it through `document.modelContext`.

To update a registered tool, pass a Vue `reactive()` config object to `useMcpTool`. Changes to its name, metadata, schemas, annotations, or allowed origins unregister the old tool and register the new definition.

## Schemas and validation

### Standard Schema (recommended)

Pass a Standard Schema validator as `input`. Its `validate` method runs before the handler, and the handler receives its parsed output with inferred TypeScript types.

Zod, Valibot, ArkType, and other compatible libraries work without adapters:

```ts
useMcpTool({
  name: 'set-theme',
  description: 'Set the active color theme.',
  input: z.object({ theme: z.enum(['light', 'dark']) }),
  handler: async ({ theme }) => ({
    content: [{ type: 'text', text: `Theme changed to ${theme}` }],
  }),
})
```

If the validator implements Standard JSON Schema, its input schema is also exposed to WebMCP clients. Schema conversion is optional; validation still works without it.

### Raw JSON Schema

Use `inputSchema` when you do not use a validator:

```ts
useMcpTool({
  name: 'calculate',
  description: 'Add two numbers.',
  inputSchema: {
    type: 'object',
    properties: {
      left: { type: 'number' },
      right: { type: 'number' },
    },
    required: ['left', 'right'],
  },
  handler: async ({ left, right }) => ({
    content: [{ type: 'text', text: String(Number(left) + Number(right)) }],
  }),
})
```

Raw JSON Schema describes the tool to WebMCP clients. It is **not validated by the polyfill**, matching native WebMCP; validate untrusted input in the handler or use a Standard Schema validator.

## Execution state and local calls

`useMcpTool` returns reactive execution state plus `execute` and `reset`:

```ts
const { state, execute, reset } = useMcpTool({
  name: 'greet',
  description: 'Greet a person.',
  input: z.object({ name: z.string() }),
  handler: async ({ name }) => ({
    content: [{ type: 'text', text: `Hello ${name}` }],
  }),
})

await execute({ name: 'Ada' })
console.log(state.lastResult)
reset()
```

`state` contains:

- `isExecuting`: whether one or more executions are active
- `lastResult`: the most recent successful result
- `error`: the most recent validation, handler, or registration error
- `executionCount`: successful executions since the last reset

`execute(input, { signal })` rejects on errors. Agent-initiated failures are returned as WebMCP error results. Each invocation receives an `AbortSignal`; pass it to cancellable work such as `fetch`.

## Tool options

| Option | Purpose |
| --- | --- |
| `name` | Required unique identifier: 1–128 characters from `A-Z`, `a-z`, `0-9`, `_`, `.`, or `-`. |
| `title` | Optional human-readable tool title. |
| `description` | Required explanation for agents. |
| `input` / `output` | Standard Schema validators. |
| `inputSchema` / `outputSchema` | Raw JSON Schema objects. |
| `annotations` | WebMCP hints: `readOnlyHint` and `untrustedContentHint`. |
| `exposedTo` | Potentially trustworthy origins permitted to access the tool. |
| `onSuccess` / `onError` | Callbacks after a successful execution or any non-cancellation error. |

Use either `input`/`output` or `inputSchema`/`outputSchema` for a tool, not both.

## Browser and SSR behavior

`WebMCPProvider` is safe to render during SSR: registration happens only after client mount. On browsers without native `document.modelContext`, it installs a lightweight, same-document polyfill and removes it when the final provider unmounts. Native WebMCP is never replaced.

Use `useWebMCPStatus()` inside the provider when the UI needs to know whether a WebMCP API is available:

```ts
const { available } = useWebMCPStatus()
```

In development, `useMcpTool()` and `useWebMCPStatus()` warn when called outside the provider. Place the provider above every component that declares or checks a tool.

## License

[MIT](./LICENSE)
