import { useTranslations } from "next-intl";
import { HeroCard } from "@/src/shared/components/HeroCard";
import { HERO_TITLE_KEY } from "@/src/features/result/result-format-copy";
import type { Pack } from "@/src/shared/types/pack";

export interface ResultHeroProps {
  /** Picks the h1's per-format phrasing (T10) — save_one reads differently
   * from rank_blind, etc. */
  format: Pack["format"];
  /** A `?p=`/`?play=` viewer looking at someone else's result. */
  shared: boolean;
  totalRounds: number;
  totalPlays: number;
}

/**
 * Solo play's copy for the shared {@link HeroCard} — the per-format h1, the
 * "picks recorded" note, and the rounds/plays pair.
 *
 * The card itself lives in `shared/` because the friends-room results screen
 * opens with the same panel. All that is left here is which strings go in it.
 *
 * The pack's own title is NOT rendered (the mock never puts it in the hero,
 * only in the sticky header bar) — `ResultScreen`'s chrome bar owns it, same
 * split as `PlayChrome`/`PlayRoundHeader` on the play screens.
 */
export function ResultHero({
  format,
  shared,
  totalRounds,
  totalPlays,
}: ResultHeroProps) {
  const t = useTranslations("result");
  const titleKey = HERO_TITLE_KEY[format];

  return (
    <HeroCard
      eyebrow={t("label")}
      title={t(shared ? titleKey.shared : titleKey.own)}
      note={t(shared ? "heroSubtitleFixedShared" : "heroSubtitleFixed")}
      stats={[
        { label: t("statRoundsCompact"), value: totalRounds },
        { label: t("statPlaysCompact"), value: totalPlays },
      ]}
    />
  );
}
