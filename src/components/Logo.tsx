// stonks brand lockup — "the last candle breaks out".
// Mark: three ascending candles on an ink tile, the tallest carrying the
// live phosphor dot. Wordmark: Fraunces italic (display serif), deliberately
// distinct from the IBM Plex body/data faces.

interface LogoProps {
  /** Mark height in px. Wordmark scales with it. */
  size?: number
  /** Render the "stonks" wordmark beside the mark. */
  wordmark?: boolean
  className?: string
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect x="2" y="2" width="60" height="60" rx="14" fill="var(--card)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="13.25" stroke="var(--border-strong)" strokeWidth="1.5" />
      <rect x="13" y="38" width="9" height="13" rx="2" fill="#1E5C40" />
      <rect x="27.5" y="28" width="9" height="23" rx="2" fill="#34D399" />
      <rect x="42" y="18" width="9" height="33" rx="2" fill="#3DDC97" />
      <rect x="45.75" y="11" width="1.6" height="7" rx="0.8" fill="#3DDC97" />
      <circle cx="46.5" cy="8" r="3" fill="#6EE7B7" />
      <circle cx="46.5" cy="8" r="5.5" fill="#34D399" opacity="0.22" />
    </svg>
  )
}

export function Logo({ size = 28, wordmark = true, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: size * 0.36 }}>
      <LogoMark size={size} />
      {wordmark && (
        <span
          className="select-none text-foreground"
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: size * 0.78,
            letterSpacing: '0.01em',
            lineHeight: 1,
          }}
        >
          stonks
        </span>
      )}
    </span>
  )
}
