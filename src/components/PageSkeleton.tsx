export function PageSkeleton() {
  return (
    <div className="space-y-5 animate-[pulse_2s_ease-in-out_infinite]">
      <div className="h-5 w-40 bg-muted rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg border border-border"
            style={{ opacity: 1 - i * 0.12 }} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-48 bg-muted rounded-lg border border-border" />
        <div className="h-48 bg-muted rounded-lg border border-border" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-lg border border-border"
            style={{ opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    </div>
  )
}
