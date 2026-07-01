export default function AboutPage() {
  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-[15px] font-semibold text-foreground">About</h2>

      <div className="border border-border rounded-lg bg-card divide-y divide-border">
        <div className="px-6 py-4 space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Disclaimer</p>
          <p className="text-[13px] text-foreground leading-relaxed">
            <strong className="font-semibold">Stonks</strong> is a personal research tool for
            screening Indian equities and mutual funds. It is not affiliated with NSE, BSE, SEBI,
            AMFI, or any data vendor.
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            All data displayed may be delayed, incomplete, or inaccurate. Nothing on this platform
            constitutes financial advice, an investment recommendation, or an offer to buy or sell
            any security. Use at your own discretion.
          </p>
        </div>
        <div className="px-6 py-4 space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Data Sources</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            MFAPI.in (mutual fund NAVs &amp; history) · NSE India official API (live
            indices &amp; equity quotes, via CORS proxy) · DeepSeek (optional AI analysis).
          </p>
        </div>
      </div>
    </div>
  )
}
