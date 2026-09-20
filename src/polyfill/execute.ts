import type { ToolDescriptor } from '../types'

function serialize(result: unknown): string {
  const text = typeof result === 'object' && result !== null ? JSON.stringify(result) : String(result)
  return text === '' ? 'Operation succeeded' : text
}

export function runTool(
  tool: ToolDescriptor,
  inputArguments: string | object = {},
  callerSignal?: AbortSignal,
): Promise<string> {
  if (callerSignal?.aborted) return Promise.reject(callerSignal.reason)
  let input: unknown
  try {
    input = typeof inputArguments === 'string'
      ? JSON.parse(inputArguments)
      : JSON.parse(JSON.stringify(inputArguments))
  } catch {
    return Promise.reject(new DOMException('Failed to parse input arguments', 'UnknownError'))
  }
  if (!isInputObject(input)) {
    return Promise.reject(new DOMException('Input arguments must be a JSON object', 'UnknownError'))
  }

  function isInputObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
  const controller = new AbortController()
  return new Promise((resolve, reject) => {
    let settled = false
    const abort = () => {
      if (!settled) {
        settled = true
        controller.abort()
        reject(callerSignal?.reason)
      }
    }
    callerSignal?.addEventListener('abort', abort, { once: true })
    const settle = (callback: () => void) => {
      if (settled) return
      settled = true
      callerSignal?.removeEventListener('abort', abort)
      callback()
    }
    const fail = (error: unknown) => {
      settle(() => reject(new DOMException(
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        'UnknownError',
      )))
    }
    try {
      Promise.resolve(tool.execute(input, { signal: controller.signal })).then(
        (result) => settle(() => {
          try {
            resolve(serialize(result))
          } catch {
            reject(new DOMException('Tool result is not JSON-serializable', 'UnknownError'))
          }
        }),
        fail,
      )
    } catch (error) {
      fail(error)
    }
  })
}
