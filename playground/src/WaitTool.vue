<script setup lang="ts">
import { ref } from 'vue'
import { useMcpTool } from '../../src'

const seconds = ref(3)
const cancelled = ref(false)
let controller: AbortController | null = null

const { state, execute } = useMcpTool({
  name: 'wait_seconds',
  title: 'Wait',
  description: 'Wait for the given number of seconds, then respond. Cancellable.',
  inputSchema: {
    type: 'object',
    properties: { seconds: { type: 'number', description: 'How long to wait, in seconds.' } },
    required: ['seconds'],
  },
  annotations: { readOnlyHint: true },
  handler: async ({ seconds }, { signal }) => {
    if (typeof seconds !== 'number' || seconds <= 0) {
      throw new Error('seconds must be a positive number')
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, seconds * 1000)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })
    return { content: [{ type: 'text', text: `Waited ${seconds}s.` }] }
  },
})

async function run(): Promise<void> {
  cancelled.value = false
  controller = new AbortController()
  try {
    await execute({ seconds: seconds.value }, { signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') cancelled.value = true
  } finally {
    controller = null
  }
}

function cancel(): void {
  controller?.abort()
}
</script>

<template>
  <section class="tool-card" aria-labelledby="wait-title">
    <div class="tool-heading">
      <div>
        <p class="eyebrow">Registered tool</p>
        <h2 id="wait-title"><code>wait_seconds</code></h2>
      </div>
      <span class="status">Cancellable via <code>ctx.signal</code></span>
    </div>

    <form class="tool-form" @submit.prevent="run">
      <label class="field-label" for="wait-seconds">Seconds</label>
      <div class="form-row">
        <input
          id="wait-seconds"
          v-model.number="seconds"
          class="name-input"
          type="number"
          min="0.1"
          step="0.1"
          :disabled="state.isExecuting"
        />
        <button type="submit" :disabled="state.isExecuting">
          {{ state.isExecuting ? 'Waiting…' : 'Run locally' }}
        </button>
        <button type="button" class="clear-button" :disabled="!state.isExecuting" @click="cancel">Cancel</button>
      </div>
    </form>

    <div class="result" aria-live="polite">
      <p class="result-label">Result</p>
      <p v-if="cancelled" class="empty">Cancelled.</p>
      <p v-else-if="state.error" class="error">{{ state.error.message }}</p>
      <p v-else-if="state.lastResult" class="result-text">{{ state.lastResult.content[0]?.text }}</p>
      <p v-else class="empty">Run to wait, or cancel while it's in flight.</p>
    </div>
  </section>
</template>
