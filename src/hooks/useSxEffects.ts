import { useRef } from 'react'
import { useScrollReveal } from './useScrollReveal'
import { useCountUp } from './useCountUp'

/**
 * Convenience hook combining useScrollReveal + useCountUp on a single container
 * ref — attach the returned ref to the page's root element. Pass `deps`
 * (e.g. `[isLoading]`) so content that mounts after an async fetch resolves
 * gets scanned too.
 */
export function useSxEffects<T extends HTMLElement = HTMLDivElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null)
  useScrollReveal(ref, deps)
  useCountUp(ref, deps)
  return ref
}
