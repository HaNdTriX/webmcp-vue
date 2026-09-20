import type { ExecuteToolOptions, InputSchema, ModelContext, ModelContextGetToolOptions, RegisteredTool } from '../types'
import { runTool } from './execute'
import { createRegistry } from './registry'
import { isPotentiallyTrustworthyOrigin } from './validation'
import { warnOnce } from '../utils/warn'

const testingShimWarning =
  'navigator.modelContextTesting is deprecated. Use document.modelContext.getTools() and executeTool() instead.'

class PolyfillModelContext extends EventTarget implements ModelContext {
  readonly __isWebMCPPolyfill = true
  readonly #registry = createRegistry()
  #ontoolchange: ((event: Event) => unknown) | null = null

  constructor() {
    super()
    this.#registry.onChange(() => this.dispatchEvent(new Event('toolchange')))
  }

  registerTool = this.#registry.registerTool

  getTools(options?: ModelContextGetToolOptions): Promise<RegisteredTool[]> {
    if (options?.fromOrigins?.some((origin) => !isPotentiallyTrustworthyOrigin(origin))) {
      return Promise.reject(new DOMException('Only secure origins are allowed in the fromOrigins list.', 'SecurityError'))
    }
    return Promise.resolve(
      [...this.#registry.getTools().values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((tool) => ({
          name: tool.name,
          title: tool.title ?? '',
          description: tool.description,
          ...(tool.inputSchema && { inputSchema: JSON.parse(JSON.stringify(tool.inputSchema)) as InputSchema }),
          ...(tool.annotations && { annotations: { ...tool.annotations } }),
          window,
          origin: location.origin,
        })),
    )
  }

  executeTool(tool: RegisteredTool, inputArguments?: string | object, options?: ExecuteToolOptions): Promise<string | null> {
    const registered = this.#registry.get(tool?.name)
    return registered
      ? runTool(registered, inputArguments ?? {}, options?.signal)
      : Promise.reject(new DOMException(`Tool "${tool?.name}" not found`, 'UnknownError'))
  }

  get ontoolchange() {
    return this.#ontoolchange
  }

  set ontoolchange(handler) {
    if (this.#ontoolchange) this.removeEventListener('toolchange', this.#ontoolchange)
    this.#ontoolchange = handler
    if (handler) this.addEventListener('toolchange', handler)
  }

  testing = {
    listTools: () => {
      warnOnce('model-context-testing-deprecated', testingShimWarning)
      return [...this.#registry.getTools().values()].map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema && JSON.stringify(tool.inputSchema),
      }))
    },
    executeTool: (name: string, input: string, options?: ExecuteToolOptions) => {
      warnOnce('model-context-testing-deprecated', testingShimWarning)
      const tool = this.#registry.get(name)
      return tool
        ? runTool(tool, input, options?.signal)
        : Promise.reject(new DOMException(`Tool "${name}" not found`, 'NotFoundError'))
    },
    registerToolsChangedCallback: (callback: () => void) => {
      warnOnce('model-context-testing-deprecated', testingShimWarning)
      return this.#registry.onChange(callback)
    },
    getCrossDocumentScriptToolResult: () => Promise.resolve('[]'),
  }
}

let installed = false
let previousModelContext: PropertyDescriptor | undefined
let previousTesting: PropertyDescriptor | undefined

export function installPolyfill(): void {
  if (typeof window === 'undefined' || (document.modelContext && !('__isWebMCPPolyfill' in document.modelContext)) || installed) return
  previousModelContext = Object.getOwnPropertyDescriptor(document, 'modelContext')
  previousTesting = Object.getOwnPropertyDescriptor(navigator, 'modelContextTesting')
  const context = new PolyfillModelContext()
  Object.defineProperty(document, 'modelContext', { value: context, configurable: true, enumerable: true })
  Object.defineProperty(navigator, 'modelContextTesting', { value: context.testing, configurable: true, enumerable: true })
  installed = true
}

export function cleanupPolyfill(): void {
  if (!installed) return
  if (previousModelContext) Object.defineProperty(document, 'modelContext', previousModelContext)
  else delete document.modelContext
  if (previousTesting) Object.defineProperty(navigator, 'modelContextTesting', previousTesting)
  else delete navigator.modelContextTesting
  installed = false
  previousModelContext = undefined
  previousTesting = undefined
}
