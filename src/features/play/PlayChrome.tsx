import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { PackHeaderBar } from "@/src/shared/components/PackHeaderBar";
import type { Pack } from "@/src/shared/types/pack";

export interface PlayChromeProps {
  /** The pack being played — where the back button returns to. Also supplies
   * the title, cover tone (thumbnail gradient) and format (meta line). */
  pack: Pack;
  isFinished: boolean;
  roundIndex: number;
  totalRounds: number;
  /**
   * Whether to print the round counter at the end of the bar. Default `true`,
   * kept for `RankPlayScreen`, whose own eyebrow is the pool name and so
   * carries no round position anywhere else.
   *
   * The mock's bar has no counter at all — it belongs to the round header's
   * eyebrow. So any screen whose `PlayRoundHeader` eyebrow is already
   * `play.roundOf` passes `false` here rather than printing it twice on one
   * page.
   */
  showRoundCounter?: boolean;
}

/**
 * The sticky bar every play screen shares: an icon-only back button, a small
 * cover-tone thumbnail, the pack title as the page's `h1`, a "SOLO" mode chip,
 * a format/round-count meta line, and a round counter.
 *
 * Matches the real mock (`Solo Play.dc.html`) rather than the earlier
 * text-Exit-link + full-bleed progress-rail header: the rail moved into the
 * round section itself as segmented dashes (see `PlayRoundHeader`, T2) — this
 * component no longer renders any progress indicator, so `progressPct` is no
 * longer part of its props (docs/superpowers/plans/2026-07-28-solo-play-results-mock-patch.md, T1).
 *
 * The round counter is client state (`roundIndex`/`isFinished` live in each
 * screen's session hook, not in the server-rendered page), so this lives in
 * the three play screens rather than on `app/packs/[id]/play/page.tsx` —
 * each screen already has `pack`, so nothing new needs threading through.
 *
 * `PlayRoundHeader` (T2) renders the per-round title as an `h2`, never an
 * `h1` — the pack title here is the page's only `h1`.
 *
 * The bar itself is `PackHeaderBar` — shared with `ResultScreen`, whose
 * result mock uses the identical shape.
 */
export function PlayChrome({
  pack,
  isFinished,
  roundIndex,
  totalRounds,
  showRoundCounter = true,
}: PlayChromeProps) {
  const t = useTranslations("play");
  const tFormat = useTranslations("formats");
  const tPack = useTranslations("pack");
  const roundLabel = isFinished
    ? t("complete")
    : t("roundOf", { current: roundIndex + 1, total: totalRounds });
  const packMeta = `${tFormat(pack.format)} · ${tPack("roundsCount", { count: totalRounds })}`;

  return (
    <PackHeaderBar
      pack={pack}
      backHref={`/packs/${pack.id}`}
      backLabel={t("exit")}
      modeLabel={t("soloMode")}
      meta={packMeta}
      end={
        showRoundCounter && (
          <Text
            variant="secondary"
            className="text-[13.5px] tabular-nums text-foreground-secondary"
          >
            {roundLabel}
          </Text>
        )
      }
    />
  );
}
