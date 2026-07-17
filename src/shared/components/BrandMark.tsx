// The Velanto brand mark: a cyan badge with a knocked-out "V". It's decorative
// wherever it appears (always beside the VELANTO wordmark, which carries the
// accessible name), so it's aria-hidden. Colors follow the --acc / --background
// tokens rather than hardcoding the hex — Velanto is dark-first, so the badge is
// cyan and the notch is the page background. The static favicon twin lives at
// app/icon.svg (which can't reach the tokens, so it mirrors the hex values).
export function BrandMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect x="1" y="1" width="30" height="30" rx="7" className="fill-acc" />
      <path
        d="M9 10 16 22 23 10"
        fill="none"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-background"
      />
    </svg>
  );
}
