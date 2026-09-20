import type { DeepReadonly } from 'vue'

export type MaybePromise<T> = T | Promise<T>

export interface ToolExecuteCallbackOptions {
  signal: AbortSignal
}

export interface ExecuteToolOptions {
  signal?: AbortSignal
}

export interface InputSchemaProperty {
  type: string
  description?: string
  [key: string]: unknown
}

export interface InputSchema {
  type: string
  properties?: Record<string, InputSchemaProperty>
  required?: readonly string[]
  [key: string]: unknown
}

export interface CallToolResult {
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
    | { type: 'resource'; resource: { uri: string; mimeType?: string; text?: string; blob?: string } }
    | { type: 'resource_link'; uri: string; name?: string; description?: string; mimeType?: string }
  >
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

export interface ToolAnnotations {
  readOnlyHint?: boolean
  untrustedContentHint?: boolean
}

export interface ToolDescriptor<TArgs = Record<string, unknown>> {
  name: string
  title?: string
  description: string
  inputSchema?: InputSchema
  outputSchema?: InputSchema
  annotations?: ToolAnnotations
  execute: (input: TArgs, options: ToolExecuteCallbackOptions) => MaybePromise<CallToolResult>
}

interface McpToolConfigBase {
  name: string
  title?: string
  description: string
  annotations?: ToolAnnotations
  exposedTo?: string[]
  onSuccess?: (result: CallToolResult) => void
  onError?: (error: Error) => void
}

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    readonly types?: { readonly input: Input; readonly output: Output }
    readonly validate: (
      value: unknown,
    ) =>
      | { readonly value: Output; readonly issues?: undefined }
      | { readonly issues: ReadonlyArray<{ readonly message: string }> }
      | Promise<
          | { readonly value: Output; readonly issues?: undefined }
          | { readonly issues: ReadonlyArray<{ readonly message: string }> }
        >
  }
}

export interface StandardJSONSchemaV1<Input = unknown, Output = Input>
  extends StandardSchemaV1<Input, Output> {
  readonly '~standard': StandardSchemaV1<Input, Output>['~standard'] & {
    readonly jsonSchema: {
      readonly input: (options: { readonly target: string }) => Record<string, unknown>
      readonly output: (options: { readonly target: string }) => Record<string, unknown>
    }
  }
}

export type StandardSchemaOutput<Schema extends StandardSchemaV1> = NonNullable<
  Schema['~standard']['types']
>['output']

export interface McpToolConfigStandard<T extends StandardSchemaV1 = StandardSchemaV1>
  extends McpToolConfigBase {
  input: T
  inputSchema?: never
  output?: StandardSchemaV1
  outputSchema?: never
  handler: (args: StandardSchemaOutput<T>, ctx: ToolExecuteCallbackOptions) => MaybePromise<CallToolResult>
}

export interface McpToolConfigJsonSchema extends McpToolConfigBase {
  input?: never
  inputSchema?: InputSchema
  output?: never
  outputSchema?: InputSchema
  handler: (
    args: Record<string, unknown>,
    ctx: ToolExecuteCallbackOptions,
  ) => MaybePromise<CallToolResult>
}

export interface ToolExecutionState<TResult = CallToolResult> {
  isExecuting: boolean
  lastResult: TResult | null
  error: Error | null
  executionCount: number
}

export interface UseMcpToolReturn<TResult = CallToolResult> {
  state: DeepReadonly<ToolExecutionState<TResult>>
  execute: (input?: Record<string, unknown>, options?: ExecuteToolOptions) => Promise<TResult>
  reset: () => void
}

export interface WebMCPProviderProps {
  name: string
  version: string
}

export interface WebMCPStatus {
  available: Readonly<import('vue').Ref<boolean>>
}

export interface RegisterToolOptions {
  signal?: AbortSignal
  exposedTo?: string[]
}

export interface RegisteredTool {
  name: string
  title?: string
  description: string
  inputSchema?: InputSchema | string
  annotations?: ToolAnnotations
  window?: Window
  origin?: string
}

export interface ModelContextGetToolOptions {
  fromOrigins?: string[]
}

export interface ModelContext extends EventTarget {
  registerTool(tool: ToolDescriptor, options?: RegisterToolOptions): Promise<undefined> | undefined
  getTools?(options?: ModelContextGetToolOptions): Promise<RegisteredTool[]>
  executeTool?(
    tool: RegisteredTool,
    inputArguments?: string | object,
    options?: ExecuteToolOptions,
  ): Promise<string | null>
  ontoolchange: ((this: ModelContext, ev: Event) => unknown) | null
}

export interface ModelContextTesting {
  listTools(): Array<{ name: string; description: string; inputSchema?: string }>
  executeTool(toolName: string, inputArgsJson: string, options?: ExecuteToolOptions): Promise<string | null>
  registerToolsChangedCallback(callback: () => void): void
  getCrossDocumentScriptToolResult(): Promise<string>
}

declare global {
  interface Document {
    modelContext?: ModelContext
  }
  interface Navigator {
    modelContextTesting?: ModelContextTesting
  }
}
