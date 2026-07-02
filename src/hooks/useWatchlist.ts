import { useState, useEffect, useCallback } from 'react'
import type { WatchlistItem } from '@/api/dataTypes'

const STORAGE_KEY = 'stonks:watchlist'

function load(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(items: WatchlistItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>(load)

  useEffect(() => {
    const handler = () => setItems(load())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const add = useCallback((item: WatchlistItem) => {
    setItems(prev => {
      const exists = prev.find(i => i.symbol === item.symbol && i.type === item.type)
      if (exists) return prev
      const next = [...prev, item]
      save(next)
      return next
    })
  }, [])

  // Keyed on symbol+type, matching add()'s dedupe key — a stock and an
  // index/fund can share a ticker, and must not collide on remove/has.
  const remove = useCallback((symbol: string, type: WatchlistItem['type']) => {
    setItems(prev => {
      const next = prev.filter(i => !(i.symbol === symbol && i.type === type))
      save(next)
      return next
    })
  }, [])

  const has = useCallback(
    (symbol: string, type: WatchlistItem['type']) => items.some(i => i.symbol === symbol && i.type === type),
    [items],
  )

  return { items, add, remove, has }
}
