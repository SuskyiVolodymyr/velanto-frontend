/**
 * The "VS" divider between two contenders — one definition in the mock shared
 * by both versus formats (1v1's `HeadToHeadRound` and nxn's `VersusRound`), so
 * it lives here once rather than as two copies that could drift.
 *
 * Exactly one may appear on a play screen: e2e/play.spec.ts does a
 * strict-mode `getByText("VS", { exact: true })`, so no format may render a
 * second "VS" anywhere else on the same page.
 */
export function VsBadge() {
  return (
    <span
      data-mono
      className="flex h-11 w-11 flex-none items-center justify-center justify-self-center rounded-pill border border-white/10 bg-surface-card font-mono text-[12.5px] font-bold text-foreground/50"
    >
      VS
    </span>
  );
}
