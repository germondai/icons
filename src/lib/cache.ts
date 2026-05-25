const store = new Map<string, { data: unknown; ts: number }>()
const TTL = 60 * 60 * 1000
const MAX = 500 // evict oldest when full (Map preserves insertion order)

export const fromCache = <T>(key: string): T | null => {
  const e = store.get(key)
  if (!e) return null
  if (Date.now() - e.ts > TTL) {
    store.delete(key)
    return null
  }
  return e.data as T
}

export const toCache = (key: string, data: unknown) => {
  if (store.size >= MAX) store.delete(store.keys().next().value as string)
  store.set(key, { data, ts: Date.now() })
}
