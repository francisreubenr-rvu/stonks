// Internal NSE symbol marker. Hooks append it when handing symbols to the data
// layer; the NSE client strips any suffix back to the bare ticker (e.g. RELIANCE).
export const NS = '.NS'

/** Normalize any decorated ticker to its bare NSE symbol. */
export function toNseSymbol(base: string): string {
  return base.replace(/\..*$/, '').trim().toUpperCase()
}
