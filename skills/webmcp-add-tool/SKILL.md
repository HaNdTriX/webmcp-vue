---
name: webmcp-add-tool
description: Adds a WebMCP tool to a Vue 3 app with useMcpTool, a Standard Schema input validator, annotations, and provider wiring. Use when the user wants to expose Vue app functionality as an MCP tool, make an action callable by AI, or add a new AI-accessible tool.
---

# Add a WebMCP Tool

Each tool is a Vue component that calls `useMcpTool()` during setup. It registers on mount and unregisters on unmount. Tools can be headless or render execution state.

## Workflow

1. Determine the tool's name, description, input schema, and handler.
2. Choose a headless or UI component.
3. Set annotations that match the tool's behavior.
4. Render the component below `<WebMCPProvider>`.

## Headless tool

```vue
<!-- components/MyTool.vue -->
<script setup lang="ts">
import { useMcpTool } from 'webmcp-vue'
import { z } from 'zod'

useMcpTool({
  name: 'my_tool',
  description: 'Do one specific thing',
  input: z.object({
    query: z.string().describe('The search query'),
  }),
  handler: async ({ query }, { signal }) => {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal })
    return {
      content: [{ type: 'text', text: await response.text() }],
    }
  },
})
</script>
```

## Tool with execution state UI

```vue
<!-- components/MyTool.vue -->
<script setup lang="ts">
import { useMcpTool } from 'webmcp-vue'
import { z } from 'zod'

const { state, execute, reset } = useMcpTool({
  name: 'process_text',
  description: 'Process text',
  input: z.object({
    text: z.string().describe('Text to process'),
  }),
  handler: async ({ text }) => ({
    content: [{ type: 'text', text: text.toUpperCase() }],
  }),
})
</script>

<template>
  <button :disabled="state.isExecuting" @click="execute({ text: 'hello' })">
    {{ state.isExecuting ? 'Processing...' : 'Run' }}
  </button>
  <p v-if="state.error">{{ state.error.message }}</p>
  <p>Executions: {{ state.executionCount }}</p>
  <button @click="reset">Reset</button>
</template>
```

## Title and annotations

Use the top-level `title` for a display name. Include only annotations that apply:

```ts
useMcpTool({
  name: 'search_catalog',
  title: 'Search catalog',
  description: 'Search the product catalog by keyword.',
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: true,
  },
  // ...
})
```

| Tool behavior | Set |
| --- | --- |
| Needs a display name | Top-level `title` |
| Only reads data | `annotations: { readOnlyHint: true }` |
| Returns user or external content | `annotations: { untrustedContentHint: true }` |
| Creates, updates, or deletes data | Omit `readOnlyHint` |

`ToolAnnotations` supports only `readOnlyHint` and `untrustedContentHint`. Do not put `title` in `annotations`; classic MCP hints such as `destructiveHint`, `idempotentHint`, and `openWorldHint` are not WebMCP fields.

## Return format

Handlers return `CallToolResult`:

```ts
return { content: [{ type: 'text', text: 'Result' }] }

return {
  content: [{ type: 'text', text: 'Found 42 results' }],
  structuredContent: { count: 42 },
}

return {
  content: [{ type: 'image', data: base64Image, mimeType: 'image/png' }],
}
```

Throw errors for failures. Agent-initiated calls are converted to `CallToolResult` values with `isError: true`; local `execute()` calls reject.

## Dynamic tools

Mounted components are available tools. Use `v-if` to control tool availability:

```vue
<template>
  <WebMCPProvider name="app" version="1.0">
    <PublicTools />
    <AdminTools v-if="user.isAdmin" />
    <BetaSearchTool v-if="featureFlags.betaSearch" />
    <RouterView />
  </WebMCPProvider>
</template>
```

## Provider wiring

Render every tool anywhere under `<WebMCPProvider>`. For several tools, collect them in a dedicated component:

```vue
<!-- components/McpTools.vue -->
<script setup lang="ts">
import SearchTool from './SearchTool.vue'
import TranslateTool from './TranslateTool.vue'
</script>

<template>
  <SearchTool />
  <TranslateTool />
</template>
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { WebMCPProvider } from 'webmcp-vue'
import McpTools from './components/McpTools.vue'
</script>

<template>
  <WebMCPProvider name="app" version="1.0">
    <McpTools />
    <RouterView />
  </WebMCPProvider>
</template>
```

## Checklist

- Tool name is unique and uses `snake_case`.
- Description starts with a specific verb.
- Input fields have `.describe()` text for agent context.
- Handler returns a `CallToolResult` with `content`.
- Annotations accurately represent side effects and untrusted output.
- The component is rendered inside `<WebMCPProvider>`.
