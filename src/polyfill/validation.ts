const toolName = /^[A-Za-z0-9_.-]{1,128}$/

export function isValidToolName(name: unknown): name is string {
  return typeof name === 'string' && toolName.test(name)
}

export function isPotentiallyTrustworthyOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    if (url.protocol === 'file:') return true
    if (url.origin !== origin) return false
    return (
      url.protocol === 'https:' ||
      url.protocol === 'wss:' ||
      url.hostname === 'localhost' ||
      url.hostname.endsWith('.localhost') ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1'
    )
  } catch {
    return false
  }
}
