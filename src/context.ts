import { inject, onMounted, onUnmounted, provide, readonly, ref, type InjectionKey } from 'vue'
import { cleanupPolyfill, installPolyfill } from './polyfill'
import type { WebMCPStatus } from './types'
import { warnOnce } from './utils/warn'

type WebMCPContext = WebMCPStatus

const missingContext: WebMCPContext = { available: readonly(ref(false)) }
export const webMCPKey: InjectionKey<WebMCPContext> = Symbol('webmcp')

let polyfillConsumers = 0

export function useWebMCPProvider(): void {
  const available = ref(false)
  let usesPolyfill = false
  provide(webMCPKey, { available: readonly(available) })

  onMounted(() => {
    const hasNative = document.modelContext && !('__isWebMCPPolyfill' in document.modelContext)
    if (!hasNative) {
      installPolyfill()
      usesPolyfill = true
      polyfillConsumers++
    }
    available.value = Boolean(document.modelContext)
  })

  onUnmounted(() => {
    if (usesPolyfill && --polyfillConsumers === 0) cleanupPolyfill()
  })
}

export function useWebMCPStatus(): WebMCPStatus {
  const context = inject(webMCPKey, missingContext)
  if (context === missingContext) {
    warnOnce(
      'missing-provider-status',
      'useWebMCPStatus must be used inside <WebMCPProvider>. Returning { available: false }.',
    )
  }
  return context
}

export function useWebMCPContext(): WebMCPContext {
  const context = inject(webMCPKey, missingContext)
  if (context === missingContext) {
    warnOnce(
      'missing-provider-tool',
      'useMcpTool is being used outside <WebMCPProvider>. The tool will not register.',
    )
  }
  return context
}
