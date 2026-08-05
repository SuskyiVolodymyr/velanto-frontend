import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CoverImage } from "@/src/shared/components/CoverImage";
import { Text } from "@/src/shared/components/Text";
import { SidebarToggle } from "@/src/shared/components/SidebarToggle";
import { HeaderUserCluster } from "@/src/shared/components/HeaderUserCluster";
import { STICKY_HEADER_SHELL_CLASS } from "@/src/shared/lib/sticky-header-shell";
import type { Pack } from "@/src/shared/types/pack";

export interface PackHeaderBarProps {
  /** Where the back button returns to, and the cover-tone thumbnail source. */
  pack: Pack;
  backHref: string;
  backLabel: string;
  /** Uppercase mode chip on the meta line — always "SOLO" today, but the
   * caller owns the copy since a future room variant would show its own
   * mode name here instead (see Rank Modes.dc.html). */
  modeLabel: string;
  meta: string;
  /** Whether the pack title is this page's `h1`. Default `true` (the play
   * screens' only heading). The result screen renders its own format-aware
   * `h1` in `ResultHero` instead, so it passes `"p"` to avoid a second `h1`
   * on the page. */
  titleAs?: "h1" | "p";
  /** Right-aligned trailing content — a round counter on the play screens, a
   * play-again action on the result screen. */
  end?: React.ReactNode;
}

/**
 * The sticky bar shared by every solo play screen and the result screen: an
 * icon-only back button, a small cover-tone thumbnail, the pack title, a mode
 * chip + meta line on a second row, and a trailing slot.
 *
 * Extracted from `PlayChrome` once `ResultScreen` needed the identical shape
 * (both mock as the same bar in `Solo Play.dc.html`/`Results.dc.html`) rather
 * than duplicating the JSX. Not `PageHeader`: that component's crumb/badge/
 * meta contract doesn't fit a cover thumbnail + two-line title block (see
 * `sticky-header-shell.ts`'s own doc comment).
 */
export function PackHeaderBar({
  pack,
  backHref,
  backLabel,
  modeLabel,
  meta,
  titleAs = "h1",
  end,
}: PackHeaderBarProps) {
  return (
    <div className={STICKY_HEADER_SHELL_CLASS}>
      {/* Leftmost, matching PageHeader: this bar is the only header on the
          play and result screens, so without it those routes get a collapsed
          rail they cannot expand. */}
      <SidebarToggle />

      <Link
        href={backHref}
        aria-label={backLabel}
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] border border-border bg-surface-card text-foreground-secondary transition-colors hover:border-white/[0.2] hover:text-foreground"
      >
        {/* The mock's back control is a plain chevron, not a full arrow —
            distinct from `BackButton`'s labeled pill (a different mock
            family), which does use ArrowLeft. */}
        <ChevronLeft size={16} strokeWidth={2.2} aria-hidden />
      </Link>

      {/* `relative` + `overflow-hidden` so a real cover can fill the tile: the
          gradient stays as the ground beneath it, which is what shows for a
          pack with no cover and what CoverImage falls back to when the stored
          key 404s. Play and Result showed the tone alone, so a pack with a
          cover lost it the moment you started playing it. */}
      <div
        aria-hidden="true"
        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[10px]"
        style={{
          background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
        }}
      >
        {pack.coverImageKey && <CoverImage coverKey={pack.coverImageKey} />}
      </div>

      <div className="flex min-w-0 flex-col gap-[3px]">
        <Text
          as={titleAs}
          variant="title"
          className="min-w-0 truncate text-[14.5px]"
        >
          {pack.title}
        </Text>
        {/* Mock puts the mode chip on this second line beside the meta text,
            not inline with the title — Solo Play/Results/Rank Modes all share
            this exact two-line header shape. The chip is a small rounded
            RECTANGLE here (6px), not the pill `Badge` renders by default. */}
        <div className="flex min-w-0 items-center gap-[7px]">
          {/* Not <Badge>: that primitive is a pill, and `cn()` is a plain join
              (see Text's doc comment) so overriding its radius/padding from
              outside would leave both utilities in play. */}
          <span className="shrink-0 rounded-[6px] bg-white/[0.08] px-2 py-[2px] text-[10.5px] font-bold tracking-[0.04em] text-foreground-secondary">
            {modeLabel}
          </span>
          <Text
            variant="tertiary"
            className="truncate text-[11.5px] max-[720px]:hidden"
          >
            {meta}
          </Text>
        </div>
      </div>

      {/* Global chrome, mirroring PageHeader's right-hand group so the account
          controls sit in the same place on the play and result screens as on
          every other route. The page's own `end` slot (round counter, play
          again) keeps its position ahead of them. */}
      <div className="ms-auto flex shrink-0 items-center gap-2.5">
        {end}
        <HeaderUserCluster />
      </div>
    </div>
  );
}
