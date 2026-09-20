import type { RegisterToolOptions, ToolDescriptor } from '../types'
import { isPotentiallyTrustworthyOrigin, isValidToolName } from './validation'

export interface Registry {
  registerTool(tool: ToolDescriptor, options?: RegisterToolOptions): Promise<undefined>
  get(name: string): ToolDescriptor | undefined
  getTools(): ReadonlyMap<string, ToolDescriptor>
  onChange(callback: () => void): () => void
}

export function createRegistry(): Registry {
  const tools = new Map<string, ToolDescriptor>()
  const listeners = new Set<() => void>()
  let pending = false
  const notify = () => {
    if (pending) return
    pending = true
    queueMicrotask(() => {
      pending = false
      listeners.forEach((listener) => listener())
    })
  }

  return {
    registerTool(tool, options) {
      if (!isValidToolName(tool.name)) {
        return Promise.reject(new DOMException('Tool name must be 1-128 characters of [A-Za-z0-9_.-]', 'InvalidStateError'))
      }
      if (!tool.description) return Promise.reject(new DOMException('Tool description must be a non-empty string', 'InvalidStateError'))
      if (typeof tool.execute !== 'function') return Promise.reject(new DOMException('Tool execute must be a function', 'InvalidStateError'))
      if (tools.has(tool.name)) return Promise.reject(new DOMException(`Tool "${tool.name}" is already registered`, 'InvalidStateError'))
      try {
        if (tool.inputSchema) JSON.stringify(tool.inputSchema)
      } catch {
        return Promise.reject(new TypeError('Tool inputSchema is not JSON-serializable'))
      }
      if (options?.exposedTo?.some((origin) => !isPotentiallyTrustworthyOrigin(origin))) {
        return Promise.reject(new DOMException('exposedTo origin is not trustworthy', 'SecurityError'))
      }
      if (options?.signal?.aborted) return Promise.reject(options.signal.reason)

      const stored = { ...tool, inputSchema: tool.inputSchema ?? { type: 'object', properties: {} } }
      tools.set(tool.name, stored)
      notify()
      options?.signal?.addEventListener('abort', () => {
        if (tools.get(tool.name) === stored && tools.delete(tool.name)) notify()
      }, { once: true })
      return Promise.resolve(undefined)
    },
    get: (name) => tools.get(name),
    getTools: () => tools,
    onChange(callback) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
  }
}
