const warned = new Set<string>()

export function warnOnce(key: string, message: string): void {
  const meta = import.meta as ImportMeta & { env?: { DEV?: boolean } }
  if (meta.env?.DEV === false || warned.has(key)) return
  warned.add(key)
  console.warn(`[webmcp-vue] ${message}`)
}
