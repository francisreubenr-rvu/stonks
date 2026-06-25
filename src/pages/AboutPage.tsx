export default function AboutPage() {
  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-base font-semibold text-foreground">About</h2>

      <div className="border border-border rounded-lg bg-card divide-y divide-border">
        <div className="px-5 py-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Disclaimer</p>
          <p className="text-sm text-foreground leading-relaxed">
            <strong className="font-semibold">Stonks</strong> is a personal research tool for
            screening Indian equities and mutual funds. It is not affiliated with NSE, BSE, SEBI,
            AMFI, or any data vendor.
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            All data displayed may be delayed, incomplete, or inaccurate. Nothing on this platform
            constitutes financial advice, an investment recommendation, or an offer to buy or sell
            any security. Use at your own discretion.
          </p>
        </div>
        <div className="px-5 py-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data Sources</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Indian-Stock-Market-API (quotes/indices) · EODHD (fundamentals, mutual funds).
            The current build uses stub clients — real HTTP calls are not wired.
          </p>
        </div>
      </div>
    </div>
  )
}
