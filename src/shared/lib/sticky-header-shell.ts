/**
 * The sticky top bar shell shared by every full-width page header: the
 * generic {@link PageHeader} and the play flow's own `PlayChrome` (which
 * can't use PageHeader directly — its content, an icon-only exit control,
 * a cover-tone swatch, and a two-line title/meta block, doesn't fit
 * PageHeader's crumb/badge/meta contract, and was pixel-matched against the
 * mock separately). Both import this constant instead of hand-typing the
 * class string, which had already drifted once (`gap-3` vs `gap-[13px]`)
 * before this existed.
 */
export const STICKY_HEADER_SHELL_CLASS =
  "sticky top-0 z-30 flex items-center gap-[13px] border-b border-border bg-background/85 px-7 py-3 backdrop-blur-md max-[720px]:px-4";
