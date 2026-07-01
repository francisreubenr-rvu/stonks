import type { ReactNode } from 'react'

// Small uppercase tracked label + H1, used atop every page (per DESIGN.md type scale).
export function SectionEyebrow({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-8">
      <div className="text-xs font-semibold tracking-widest text-primary mb-2 uppercase">{eyebrow}</div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground m-0">{title}</h1>
        {aside}
      </div>
    </div>
  )
}
