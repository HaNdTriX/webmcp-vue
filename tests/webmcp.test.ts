import { createApp, defineComponent, h, nextTick, reactive } from 'vue'
import { afterEach, expect, test, vi } from 'vitest'
import { WebMCPProvider, useMcpTool, useWebMCPStatus } from '../src'
import { runTool } from '../src/polyfill/execute'

let app: ReturnType<typeof createApp> | undefined
let host: HTMLDivElement | undefined

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = undefined
  host = undefined
  vi.restoreAllMocks()
})

test('warns once when status is used outside the provider', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const Root = defineComponent({
    setup() {
      useWebMCPStatus()
      useWebMCPStatus()
      return () => null
    },
  })

  host = document.createElement('div')
  document.body.append(host)
  app = createApp(Root)
  app.mount(host)

  expect(warn).toHaveBeenCalledTimes(1)
  expect(warn).toHaveBeenCalledWith(
    '[webmcp-vue] useWebMCPStatus must be used inside <WebMCPProvider>. Returning { available: false }.',
  )
})

test('wraps synchronous tool errors as UnknownError', async () => {
  await expect(runTool({
    name: 'throws',
    description: 'Throws synchronously',
    execute: () => {
      throw new Error('boom')
    },
  })).rejects.toMatchObject({
    name: 'UnknownError',
    message: 'Tool execution failed: boom',
  })
})

test('registers, executes, and unregisters a tool', async () => {
  const Tool = defineComponent({
    setup() {
      useMcpTool({
        name: 'greet',
        description: 'Say hello',
        input: {
          '~standard': {
            version: 1,
            vendor: 'test',
            validate(value) {
              if (
                typeof value === 'object' &&
                value !== null &&
                'name' in value &&
                typeof value.name === 'string'
              ) {
                return { value: { name: value.name } }
              }
              return { issues: [{ message: 'name must be a string' }] }
            },
            jsonSchema: {
              input: () => ({
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name'],
              }),
              output: () => ({ type: 'object' }),
            },
          },
        },
        handler: async ({ name }) => ({
          content: [{ type: 'text', text: `Hello ${name}` }],
        }),
      })
      return () => null
    },
  })
  const Root = defineComponent({
    setup: () => () => h(WebMCPProvider, { name: 'test', version: '1.0' }, () => h(Tool)),
  })

  host = document.createElement('div')
  document.body.append(host)
  app = createApp(Root)
  app.mount(host)
  await nextTick()
  await nextTick()

  const tools = await document.modelContext?.getTools?.()
  expect(tools?.map((tool) => tool.name)).toEqual(['greet'])

  const result = await document.modelContext?.executeTool?.(tools![0], { name: 'Vue' })
  expect(JSON.parse(result ?? '{}')).toEqual({
    content: [{ type: 'text', text: 'Hello Vue' }],
  })

  app.unmount()
  app = undefined
  expect(document.modelContext).toBeUndefined()
})

test('re-registers a reactive tool config when its name changes', async () => {
  const config = reactive({
    name: 'first-name',
    description: 'First registration',
    handler: async () => ({ content: [] }),
  })
  const Tool = defineComponent({
    setup() {
      useMcpTool(config)
      return () => null
    },
  })
  const Root = defineComponent({
    setup: () => () => h(WebMCPProvider, { name: 'test', version: '1.0' }, () => h(Tool)),
  })

  host = document.createElement('div')
  document.body.append(host)
  app = createApp(Root)
  app.mount(host)
  await nextTick()
  await nextTick()
  expect((await document.modelContext?.getTools?.())?.map((tool) => tool.name)).toEqual(['first-name'])

  config.name = 'second-name'
  config.description = 'Second registration'
  await nextTick()
  await nextTick()

  const tools = await document.modelContext?.getTools?.()
  expect(tools?.map((tool) => tool.name)).toEqual(['second-name'])
  expect(tools?.[0].description).toBe('Second registration')
})

test('passes raw JSON Schema input to the handler without polyfill validation', async () => {
  const Tool = defineComponent({
    setup() {
      useMcpTool({
        name: 'raw-schema',
        description: 'Receives raw input',
        inputSchema: {
          type: 'object',
          properties: { count: { type: 'number' } },
          required: ['count'],
        },
        handler: async (input) => ({
          content: [{ type: 'text', text: String(input.count) }],
        }),
      })
      return () => null
    },
  })
  const Root = defineComponent({
    setup: () => () => h(WebMCPProvider, { name: 'test', version: '1.0' }, () => h(Tool)),
  })

  host = document.createElement('div')
  document.body.append(host)
  app = createApp(Root)
  app.mount(host)
  await nextTick()
  await nextTick()

  const [tool] = await document.modelContext?.getTools?.() ?? []
  const result = await document.modelContext?.executeTool?.(tool, { count: 'not-a-number' })
  expect(JSON.parse(result ?? '{}')).toEqual({
    content: [{ type: 'text', text: 'not-a-number' }],
  })
})

test('reports Standard JSON Schema conversion errors and releases the tool name', async () => {
  const errors: Error[] = []
  const InvalidTool = defineComponent({
    setup() {
      useMcpTool({
        name: 'retryable',
        description: 'Has an invalid converter',
        input: {
          '~standard': {
            version: 1,
            vendor: 'test',
            validate: (value) => ({ value }),
            jsonSchema: {
              input: () => ({}),
              output: () => ({ type: 'object' }),
            },
          },
        },
        handler: async () => ({ content: [] }),
        onError: (error) => errors.push(error),
      })
      return () => null
    },
  })
  const ValidTool = defineComponent({
    setup() {
      useMcpTool({
        name: 'retryable',
        description: 'Can use the released name',
        handler: async () => ({ content: [] }),
      })
      return () => null
    },
  })
  const Root = defineComponent({
    props: { valid: Boolean },
    setup: (props) => () => h(WebMCPProvider, { name: 'test', version: '1.0' }, () => h(props.valid ? ValidTool : InvalidTool)),
  })

  host = document.createElement('div')
  document.body.append(host)
  app = createApp(Root, { valid: false })
  app.mount(host)
  await nextTick()
  await nextTick()
  expect(errors).toHaveLength(1)
  expect(errors[0].message).toContain('root type')

  app.unmount()
  app = createApp(Root, { valid: true })
  app.mount(host)
  await nextTick()
  await nextTick()
  expect((await document.modelContext?.getTools?.())?.map((tool) => tool.name)).toEqual(['retryable'])
})
