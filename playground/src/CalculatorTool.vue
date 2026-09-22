<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMcpTool } from '../../src'

const a = ref(2)
const b = ref(3)
const { state, execute } = useMcpTool({
  name: 'add_numbers',
  title: 'Add two numbers',
  description: 'Add two numbers and return the sum.',
  inputSchema: {
    type: 'object',
    properties: {
      a: { type: 'number', description: 'First addend.' },
      b: { type: 'number', description: 'Second addend.' },
    },
    required: ['a', 'b'],
  },
  outputSchema: {
    type: 'object',
    properties: { sum: { type: 'number', description: 'The sum of a and b.' } },
    required: ['sum'],
  },
  annotations: { readOnlyHint: true },
  handler: async ({ a, b }) => {
    if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error('a and b must be numbers')
    }
    const sum = a + b
    return {
      content: [{ type: 'text', text: `${a} + ${b} = ${sum}` }],
      structuredContent: { sum },
    }
  },
})

const sum = computed(() => state.lastResult?.structuredContent?.sum)

async function calculate(): Promise<void> {
  await execute({ a: a.value, b: b.value })
}
</script>

<template>
  <section class="tool-card" aria-labelledby="calc-title">
    <div class="tool-heading">
      <div>
        <p class="eyebrow">Registered tool</p>
        <h2 id="calc-title"><code>add_numbers</code></h2>
      </div>
      <span class="status">Demonstrates <code>outputSchema</code></span>
    </div>

    <form class="tool-form" @submit.prevent="calculate">
      <div class="form-row">
        <div>
          <label class="field-label" for="calc-a">A</label>
          <input id="calc-a" v-model.number="a" class="name-input" type="number" :disabled="state.isExecuting" />
        </div>
        <div>
          <label class="field-label" for="calc-b">B</label>
          <input id="calc-b" v-model.number="b" class="name-input" type="number" :disabled="state.isExecuting" />
        </div>
        <button type="submit" :disabled="state.isExecuting">Calculate</button>
      </div>
    </form>

    <div class="result" aria-live="polite">
      <p class="result-label">Result</p>
      <p v-if="state.error" class="error">{{ state.error.message }}</p>
      <p v-else-if="sum !== undefined" class="result-text">Sum: {{ sum }}</p>
      <p v-else class="empty">Enter two numbers to invoke the tool.</p>
    </div>
  </section>
</template>
