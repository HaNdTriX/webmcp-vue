<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMcpTool } from '../../src'

const count = ref(0)
const { state, execute } = useMcpTool({
  name: 'increment_counter',
  title: 'Increment counter',
  description: "Change the page's shared counter by a given amount (default 1).",
  inputSchema: {
    type: 'object',
    properties: { by: { type: 'number', description: 'Amount to add (can be negative).' } },
  },
  outputSchema: {
    type: 'object',
    properties: { count: { type: 'number', description: 'The counter value after the change.' } },
    required: ['count'],
  },
  // No readOnlyHint: this tool mutates app state, unlike the read-only examples above.
  handler: async ({ by }) => {
    const delta = typeof by === 'number' && Number.isFinite(by) ? by : 1
    count.value += delta
    return {
      content: [{ type: 'text', text: `Counter is now ${count.value}.` }],
      structuredContent: { count: count.value },
    }
  },
})

const disabled = computed(() => state.isExecuting)
</script>

<template>
  <section class="tool-card" aria-labelledby="counter-title">
    <div class="tool-heading">
      <div>
        <p class="eyebrow">Registered tool</p>
        <h2 id="counter-title"><code>increment_counter</code></h2>
      </div>
      <span class="status">Mutates shared state</span>
    </div>

    <div class="form-row">
      <button type="button" :disabled="disabled" @click="execute({ by: -1 })">-1</button>
      <p class="counter-value">{{ count }}</p>
      <button type="button" :disabled="disabled" @click="execute({ by: 1 })">+1</button>
    </div>

    <div class="result" aria-live="polite">
      <p class="result-label">Result</p>
      <p v-if="state.error" class="error">{{ state.error.message }}</p>
      <p v-else class="result-text">{{ state.executionCount }} call{{ state.executionCount === 1 ? '' : 's' }} so far.</p>
    </div>
  </section>
</template>
