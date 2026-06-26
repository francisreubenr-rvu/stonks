export const NS = '.NS'

export function toYahooSymbol(base: string): string {
  return `${base.replace(/\..*$/, '')}${NS}`
}
