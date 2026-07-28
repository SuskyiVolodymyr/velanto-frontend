import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { ProgressBar } from "@/src/shared/components/ProgressBar";
import { buttonClassName } from "@/src/shared/components/Button";
import { cn } from "@/src/shared/lib/cn";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";

export interface PlayChromeProps {
  /** The pack being played — where "Exit" returns to. */
  packId: string;
  title: string;
  isFinished: boolean;
  roundIndex: number;
  totalRounds: number;
  /**
   * 0–100. Callers already compute this (`PlayScreen` reads it off `session`;
   * `RankPlayScreen`/`HeadToHeadPlayScreen` share the same inline
   * `isFinished ? 100 : Math.round((roundIndex / Math.max(totalRounds, 1)) * 100)`
   * expression) — this component does not recompute it.
   */
  progressPct: number;
}

/**
 * The sticky bar every play screen shares: the pack title as the page's `h1`,
 * a round counter, an Exit link, and a full-bleed progress rail beneath the
 * row — absorbing today's `PlayHeader` (rendered by the page) and
 * `PlayProgress` (rendered by each screen) into one component (T2, see
 * docs/superpowers/plans/2026-07-28-solo-play-results-redesign.md).
 *
 * The round counter is client state (`roundIndex`/`isFinished` live in each
 * screen's session hook, not in the server-rendered page), so this moves
 * INTO the three play screens rather than staying on `app/packs/[id]/play/page.tsx`
 * — each screen already has `pack`, so nothing new needs threading through.
 *
 * `PlayRoundHeader` (T3) renders the per-round title as an `h2`, never an
 * `h1` — the pack title here is the page's only `h1`, matching `PlayHeader`'s
 * original doc comment on why a title is shown at all (a player arriving from
 * a shared link has no other on-page answer to "what am I playing?").
 *
 * Structural precedent: `PackDetailScreen`'s sticky action bar (same sticky
 * treatment, same `PACK_CONTAINER`-wrapped row), so the two pack surfaces
 * match.
 */
export function PlayChrome({
  packId,
  title,
  isFinished,
  roundIndex,
  totalRounds,
  progressPct,
}: PlayChromeProps) {
  const t = useTranslations("play");
  // Same string in the row and the rail's aria-label, so the rail is
  // announced once meaningfully rather than twice with different text.
  const roundLabel = isFinished
    ? t("complete")
    : t("roundOf", { current: roundIndex + 1, total: totalRounds });

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div
        className={cn(
          PACK_CONTAINER,
          "flex items-center gap-3 py-3 max-[720px]:px-4",
        )}
      >
        <Text as="h1" variant="title" className="min-w-0 truncate text-xl">
          {title}
        </Text>
        <div className="ms-auto flex items-center gap-3">
          <Text
            variant="secondary"
            className="text-[13.5px] tabular-nums text-foreground-secondary"
          >
            {roundLabel}
          </Text>
          <Link
            href={`/packs/${packId}`}
            className={buttonClassName("ghost", undefined, "sm")}
          >
            {t("exit")}
          </Link>
        </div>
      </div>
      <ProgressBar size="rail" value={progressPct} ariaLabel={roundLabel} />
    </div>
  );
}
