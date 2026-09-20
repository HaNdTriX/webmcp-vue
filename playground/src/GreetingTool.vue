<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMcpTool, useWebMCPStatus } from '../../src'

const name = ref('')
const { available } = useWebMCPStatus()
const { state, execute, reset } = useMcpTool({
  name: 'greet',
  title: 'Greet someone',
  description: 'Return a friendly greeting for a provided name.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'The name to greet.' },
    },
    required: ['name'],
  },
  annotations: { readOnlyHint: true },
  handler: async ({ name: inputName }) => {
    if (typeof inputName !== 'string' || !inputName.trim()) {
      throw new Error('name must be a non-empty string')
    }

    return {
      content: [{ type: 'text', text: `Hello, ${inputName.trim()}!` }],
    }
  },
})

const resultText = computed(() => {
  const content = state.lastResult?.content.find((item) => item.type === 'text')
  return content?.text ?? ''
})

async function greet(): Promise<void> {
  await execute({ name: name.value })
}

function clear(): void {
  name.value = ''
  reset()
}
</script>

<template>
  <section class="tool-card" aria-labelledby="tool-title">
    <div class="tool-heading">
      <div>
        <p class="eyebrow">Registered tool</p>
        <h2 id="tool-title"><code>greet</code></h2>
      </div>
      <span class="status" :class="{ ready: available }">
        {{ available ? 'WebMCP ready' : 'Waiting for WebMCP' }}
      </span>
    </div>

    <form class="tool-form" @submit.prevent="greet">
      <label class="field-label" for="name">Name</label>
      <div class="form-row">
        <input
          id="name"
          v-model="name"
          class="name-input"
          name="name"
          autocomplete="name"
          placeholder="Ada"
          :disabled="state.isExecuting"
          required
        />
        <button type="submit" :disabled="state.isExecuting">
          {{ state.isExecuting ? 'Greeting…' : 'Run locally' }}
        </button>
      </div>
    </form>

    <div class="result" aria-live="polite">
      <p class="result-label">Result</p>
      <p v-if="state.error" class="error">{{ state.error.message }}</p>
      <p v-else-if="resultText" class="result-text">{{ resultText }}</p>
      <p v-else class="empty">Enter a name to invoke the tool.</p>
    </div>

    <div class="tool-footer">
      <span>{{ state.executionCount }} successful local call{{ state.executionCount === 1 ? '' : 's' }}</span>
      <button class="clear-button" type="button" @click="clear">Clear</button>
    </div>
  </section>
</template>
