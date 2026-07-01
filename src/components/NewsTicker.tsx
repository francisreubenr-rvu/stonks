interface NewsItem { tag: string; text: string }

// Scrolling market-news band (mockup's Dashboard news marquee), restyled to
// light surfaces per DESIGN.md — no dark gradient background.
export function NewsTicker({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden mb-8">
      <div className="flex items-center border-b border-border overflow-hidden">
        <span className="shrink-0 text-xs font-semibold tracking-wide text-primary-foreground bg-primary px-3 py-1.5 self-stretch flex items-center">
          MARKET NEWS
        </span>
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute right-0 top-0 bottom-0 w-14 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, var(--color-card), transparent)' }} />
          <div className="flex w-max" style={{ animation: 'sxMarquee 38s linear infinite' }}>
            {[items, items].map((group, gi) => (
              <div key={gi} className="flex">
                {group.map((n, i) => (
                  <div key={`${gi}-${i}`} className="flex-none flex items-center gap-2 px-5 py-2 border-r border-border whitespace-nowrap">
                    <span className="text-xs font-bold text-primary">{n.tag}</span>
                    <span className="text-sm text-foreground">{n.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
