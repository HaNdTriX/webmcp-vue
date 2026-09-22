---
name: webmcp-setup
description: Sets up webmcp-vue in an existing Vue 3 or Nuxt app. Installs dependencies, adds WebMCPProvider, creates a first tool, and explains how to connect an MCP client bridge. Use when the user wants to set up WebMCP, integrate webmcp-vue, or make a Vue app accessible to AI agents.
---

# Set Up webmcp-vue

`webmcp-vue` exposes Vue app functionality as typed tools on `document.modelContext`, the WebMCP browser API. AI agents can discover and invoke those tools.

## 1. Install dependencies

```bash
pnpm add webmcp-vue zod
```

Zod is optional. Any [Standard Schema](https://standardschema.dev)-compatible validator works, or use raw JSON Schema.

## 2. Add `WebMCPProvider`

All `useMcpTool()` and `useWebMCPStatus()` calls must be descendants of the provider. It installs a polyfill when native browser support is unavailable.

### Vue / Vite

Wrap the app root:

```vue
<!-- App.vue -->
<script setup lang="ts">
import { WebMCPProvider } from 'webmcp-vue'
</script>

<template>
  <WebMCPProvider name="my-app" version="1.0">
    <RouterView />
  </WebMCPProvider>
</template>
```

### Nuxt

Place the provider in `app.vue`. It is SSR-safe: WebMCP registration happens only after client mount.

```vue
<!-- app.vue -->
<script setup lang="ts">
import { WebMCPProvider } from 'webmcp-vue'
</script>

<template>
  <WebMCPProvider name="my-app" version="1.0">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </WebMCPProvider>
</template>
```

## 3. Create a first tool

Create a headless component:

```vue
<!-- components/GreetTool.vue -->
<script setup lang="ts">
import { useMcpTool } from 'webmcp-vue'
import { z } from 'zod'

useMcpTool({
  name: 'greet',
  description: 'Greet someone by name.',
  input: z.object({
    name: z.string().describe('The name to greet'),
  }),
  handler: async ({ name }, { signal }) => {
    const response = await fetch(`/api/greet?name=${encodeURIComponent(name)}`, { signal })
    return { content: [{ type: 'text', text: await response.text() }] }
  },
})
</script>
```

Render it inside the provider:

```vue
<template>
  <WebMCPProvider name="my-app" version="1.0">
    <GreetTool />
    <RouterView />
  </WebMCPProvider>
</template>
```

## 4. Connect AI clients

Desktop MCP clients cannot access `document.modelContext` directly. Connect them through a WebMCP browser bridge and local MCP server.

Configure the local server in Cursor:

```json
{
  "mcpServers": {
    "webmcp-server": {
      "command": "npx",
      "args": ["webmcp-server"]
    }
  }
}
```

Or add it to Claude Code:

```bash
claude mcp add --transport stdio webmcp-server -- npx webmcp-server
```

Then open the app in Chrome and activate the bridge extension.

## 5. Verify

1. Run the app in a browser.
2. Confirm the bridge extension lists the registered tool.
3. Confirm the MCP client can discover and call it.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Tool does not appear | Activate the bridge extension and confirm the MCP server is running. |
| `useMcpTool` warns about a missing provider | Render the component inside `<WebMCPProvider>`. |
| Tool does not work during SSR | Keep browser-only work in the handler; registration starts after client mount. |
