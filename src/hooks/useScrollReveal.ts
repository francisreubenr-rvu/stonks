import { useEffect, useRef, type RefObject } from 'react'

/**
 * Reveal-on-scroll for elements tagged `data-reveal` (optionally
 * `data-reveal-delay="120"`) inside the given (or newly created) ref's subtree.
 * Respects prefers-reduced-motion. Pass an existing ref to combine with
 * useCountUp on the same container.
 *
 * Pass `deps` (e.g. `[isLoading]`) so newly-mounted elements — such as content
 * that swaps in after an async fetch resolves — get re-scanned and observed.
 * Already-revealed elements (`data-revealed`) are skipped on re-scans.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  externalRef?: RefObject<T | null>,
  deps: unknown[] = [],
) {
  const ownRef = useRef<T>(null)
  const ref = externalRef ?? ownRef
  const depKey = deps.join(',')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timers: ReturnType<typeof setTimeout>[] = []
    // Mark elements only once they actually reveal — marking eagerly here would
    // make React StrictMode's dev-mode double-invoke permanently skip elements
    // whose first (discarded) effect pass never got to observe them.
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])'))

    if (reduced) {
      els.forEach(el => { el.setAttribute('data-revealed', '1'); el.style.opacity = '1'; el.style.transform = 'none' })
      return
    }

    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return
        const el = en.target as HTMLElement
        el.setAttribute('data-revealed', '1')
        const d = parseInt(el.getAttribute('data-reveal-delay') || '0', 10)
        el.style.animation = `sxReveal 0.5s cubic-bezier(0.2,0.7,0.2,1) ${d}ms both`
        const commit = () => { el.style.animation = 'none'; el.style.opacity = '1'; el.style.transform = 'none' }
        el.addEventListener('animationend', commit, { once: true })
        timers.push(setTimeout(commit, d + 900))
        obs.unobserve(el)
      })
    }, { threshold: 0.08 })

    els.forEach(el => obs.observe(el))
    return () => { obs.disconnect(); timers.forEach(clearTimeout) }
  }, [ref, depKey])

  return ref
}
