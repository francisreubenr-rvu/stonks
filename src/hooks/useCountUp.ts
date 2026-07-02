import { useEffect, useRef, type RefObject } from 'react'

function fmt(val: number, dec: number, comma: boolean, prefix: string, suffix: string) {
  // Format the absolute value and re-prepend the sign: round-tripping the
  // integer part through Number() would drop the sign of "-0" (any negative
  // value between -1 and 0 mid-animation) and render the wrong sign.
  const sign = val < 0 ? '-' : ''
  const abs = Math.abs(val)
  let str = abs.toFixed(dec)
  if (comma) {
    const parts = str.split('.')
    parts[0] = Number(parts[0]).toLocaleString('en-IN')
    str = parts.join('.')
  }
  return prefix + sign + str + suffix
}

/**
 * Animates elements tagged `data-countup data-target="24182.65"` (optionally
 * `data-decimals`, `data-comma="1"`, `data-prefix`, `data-suffix`) from 0 up
 * to their target value once they scroll into view.
 *
 * Pass `deps` (e.g. `[isLoading]`) to re-scan after async content mounts.
 */
export function useCountUp<T extends HTMLElement = HTMLDivElement>(
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
    const raf: number[] = []
    const timers: ReturnType<typeof setTimeout>[] = []
    // Mark elements only once they actually animate — see useScrollReveal for why.
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-countup]:not([data-cup-done])'))

    const animate = (el: HTMLElement) => {
      el.setAttribute('data-cup-done', '1')
      const target = parseFloat(el.getAttribute('data-target') || '0')
      const dec = parseInt(el.getAttribute('data-decimals') || '0', 10)
      const comma = el.getAttribute('data-comma') === '1'
      const prefix = el.getAttribute('data-prefix') || ''
      const suffix = el.getAttribute('data-suffix') || ''
      const finalText = fmt(target, dec, comma, prefix, suffix)
      if (reduced) { el.textContent = finalText; return }
      const dur = 1100
      const start = performance.now()
      let settled = false
      const settle = () => { if (settled) return; settled = true; el.textContent = finalText }
      const step = (now: number) => {
        if (settled) return
        const t = Math.min((now - start) / dur, 1)
        const e = 1 - Math.pow(1 - t, 3)
        el.textContent = fmt(target * e, dec, comma, prefix, suffix)
        if (t < 1) raf.push(requestAnimationFrame(step))
        else settle()
      }
      raf.push(requestAnimationFrame(step))
      timers.push(setTimeout(settle, dur + 400))
    }

    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return
        animate(en.target as HTMLElement)
        obs.unobserve(en.target)
      })
    }, { threshold: 0.6 })
    els.forEach(el => obs.observe(el))

    return () => { obs.disconnect(); raf.forEach(cancelAnimationFrame); timers.forEach(clearTimeout) }
  }, [ref, depKey])

  return ref
}
