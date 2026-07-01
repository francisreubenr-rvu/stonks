// AMFI active-scheme registry.
//
// mfapi.in mirrors the full AMFI history and still lists ~37.6k schemes, but
// ~62% of those are dead/merged/closed (e.g. Grindlays, pre-2010 plans). AMFI's
// NAVAll feed is the authoritative list of schemes that are *currently active*
// and carry a live ISIN — the same registry NSE MF / BSE StAR MF trade against.
//
// We ship a snapshot of the active scheme codes (public/amfi-active-codes.json,
// regenerated from https://portal.amfiindia.com/spages/NAVAll.txt) and use it to
// prune the fund universe down to verifiable, tradeable schemes. It loads keyless
// and offline; to refresh, re-run the generator documented in the repo.

let activeCache: Set<number> | null = null
let inflight: Promise<Set<number>> | null = null

export async function fetchActiveSchemeCodes(): Promise<Set<number>> {
  if (activeCache) return activeCache
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch('./amfi-active-codes.json')
      if (!res.ok) throw new Error(`amfi manifest ${res.status}`)
      const codes = (await res.json()) as number[]
      activeCache = new Set(codes)
      return activeCache
    } catch {
      // Manifest missing/unreadable — return an empty set so callers can choose
      // to skip filtering rather than blank the whole fund list.
      activeCache = new Set<number>()
      return activeCache
    } finally {
      inflight = null
    }
  })()
  return inflight
}
