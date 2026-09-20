import { onMounted, onUnmounted, reactive, readonly, watch, type WatchStopHandle } from 'vue'
import { useWebMCPContext } from './context'
import type {
  CallToolResult,
  InputSchema,
  McpToolConfigJsonSchema,
  McpToolConfigStandard,
  StandardJSONSchemaV1,
  StandardSchemaV1,
  ToolDescriptor,
  ToolExecutionState,
  UseMcpToolReturn,
} from './types'

const owners = new Map<string, symbol>()

function errorFrom(thrown: unknown): Error {
  if (thrown instanceof Error) return thrown
  if (typeof thrown === 'object' && thrown !== null && 'name' in thrown) {
    const source = thrown as { name: string; message?: unknown }
    const error = new Error(typeof source.message === 'string' ? source.message : String(thrown))
    error.name = source.name
    return error
  }
  return new Error(String(thrown))
}

async function parseStandardInput(
  schema: StandardSchemaV1,
  input: Record<string, unknown>,
): Promise<unknown> {
  const result = await schema['~standard'].validate(input)
  if ('issues' in result && result.issues) {
    throw new Error(result.issues.map((issue) => issue.message).join('; '))
  }
  return result.value
}

function standardJsonSchema(
  schema: StandardSchemaV1,
  direction: 'input' | 'output',
): { inputSchema: InputSchema } | { outputSchema: InputSchema } | undefined {
  if (!hasJsonSchema(schema)) return undefined
  const convert = schema['~standard'].jsonSchema[direction]
  const jsonSchema = convert({ target: 'draft-07' })
  if (!isInputSchema(jsonSchema)) {
    throw new TypeError(`Standard Schema ${direction} JSON Schema must include a root type`)
  }
  delete jsonSchema.$schema
  return direction === 'input'
    ? { inputSchema: jsonSchema }
    : { outputSchema: jsonSchema }
}

function isInputSchema(schema: Record<string, unknown>): schema is InputSchema {
  return typeof schema.type === 'string'
}

function hasJsonSchema(schema: StandardSchemaV1): schema is StandardJSONSchemaV1 {
  return 'jsonSchema' in schema['~standard']
}

export function useMcpTool<T extends StandardSchemaV1>(config: McpToolConfigStandard<T>): UseMcpToolReturn
export function useMcpTool(config: McpToolConfigJsonSchema): UseMcpToolReturn
export function useMcpTool(config: McpToolConfigStandard | McpToolConfigJsonSchema): UseMcpToolReturn {
  const { available } = useWebMCPContext()
  const state = reactive<ToolExecutionState>({
    isExecuting: false,
    lastResult: null,
    error: null,
    executionCount: 0,
  })
  let inFlight = 0
  let mounted = false
  let stop: WatchStopHandle | undefined
  let unregister: (() => void) | undefined

  async function run(
    input: Record<string, unknown>,
    signal: AbortSignal,
    throwOnError: boolean,
  ): Promise<CallToolResult> {
    inFlight++
    state.isExecuting = true
    state.error = null
    try {
      const args = config.input ? await parseStandardInput(config.input, input) : input
      const result = await config.handler(args as never, { signal })
      inFlight--
      if (mounted) {
        state.isExecuting = inFlight > 0
        state.lastResult = result
        state.executionCount++
      }
      config.onSuccess?.(result)
      return result
    } catch (thrown) {
      const error = errorFrom(thrown)
      inFlight--
      if (!signal.aborted) {
        if (mounted) {
          state.isExecuting = inFlight > 0
          state.error = error
        }
        config.onError?.(error)
      } else if (mounted) {
        state.isExecuting = inFlight > 0
      }
      if (throwOnError) throw error
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true }
    }
  }

  function register(): void {
    unregister?.()
    if (typeof document === 'undefined' || !document.modelContext || !available.value) return
    const toolName = config.name
    const token = Symbol(toolName)
    if (owners.has(toolName)) return
    owners.set(toolName, token)
    const controller = new AbortController()
    const onRegistrationError = (thrown: unknown) => {
      const error = errorFrom(thrown)
      if (error.name === 'AbortError') return
      if (owners.get(toolName) === token) owners.delete(toolName)
      if (mounted) state.error = error
      config.onError?.(error)
    }
    try {
      const standardInput = config.input
      const descriptor: ToolDescriptor = {
        name: toolName,
        ...(config.title && { title: config.title }),
        description: config.description,
        ...(standardInput
          ? standardJsonSchema(standardInput, 'input')
          : config.inputSchema && { inputSchema: config.inputSchema }),
        ...(standardInput && config.output
          ? standardJsonSchema(config.output, 'output')
          : !standardInput && config.outputSchema && { outputSchema: config.outputSchema }),
        ...(config.annotations && { annotations: config.annotations }),
        execute: (args, options) => run(args, options?.signal ?? new AbortController().signal, false),
      }
      const registration = document.modelContext.registerTool(descriptor, {
        signal: controller.signal,
        ...(config.exposedTo && { exposedTo: config.exposedTo }),
      })
      if (registration) registration.catch(onRegistrationError)
    } catch (thrown) {
      onRegistrationError(thrown)
    }
    unregister = () => {
      if (owners.get(toolName) === token) {
        owners.delete(toolName)
        controller.abort()
      }
    }
  }

  onMounted(() => {
    mounted = true
    stop = watch([available, () => config], register, { deep: true, immediate: true })
  })
  onUnmounted(() => {
    mounted = false
    stop?.()
    unregister?.()
  })

  return {
    state: readonly(state),
    execute: (input = {}, options) => run(input, options?.signal ?? new AbortController().signal, true),
    reset: () => Object.assign(state, { isExecuting: false, lastResult: null, error: null, executionCount: 0 }),
  }
}
