import * as idbkv from 'idb-keyval'

const DEFAULT_TTL = 3600000 // 1 hour

interface CacheEntry<T> {
  data: T
  expiry: number
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const entry = await idbkv.get<CacheEntry<T>>(key)
    if (!entry) return null
    if (Date.now() > entry.expiry) {
      await idbkv.del(key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export async function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_TTL): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, expiry: Date.now() + ttlMs }
    await idbkv.set(key, entry)
  } catch {
    // IndexedDB unavailable (private browsing, quota) — silently fail
  }
}

export function cacheKey(parts: string[]): string {
  return `stonks:${parts.join(':')}`
}
