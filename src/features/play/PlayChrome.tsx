import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import type { Pack } from "@/src/shared/types/pack";

export interface PlayChromeProps {
  /** The pack being played — where the back button returns to. Also supplies
   * the title, cover tone (thumbnail gradient) and format (meta line). */
  pack: Pack;
  isFinished: boolean;
  roundIndex: number;
  totalRounds: number;
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
 */
export function PlayChrome({
  pack,
  isFinished,
  roundIndex,
  totalRounds,
}: PlayChromeProps) {
  const t = useTranslations("play");
  const tFormat = useTranslations("formats");
  const tPack = useTranslations("pack");
  const roundLabel = isFinished
    ? t("complete")
    : t("roundOf", { current: roundIndex + 1, total: totalRounds });
  const packMeta = `${tFormat(pack.format)} · ${tPack("roundsCount", { count: totalRounds })}`;

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-7 py-3 backdrop-blur-md max-[720px]:px-4">
      <Link
        href={`/packs/${pack.id}`}
        aria-label={t("exit")}
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-tile border border-border bg-white/[0.03] text-foreground-secondary transition-colors hover:border-white/[0.18] hover:text-foreground"
      >
        <ArrowLeft size={18} aria-hidden />
      </Link>

      <div
        aria-hidden="true"
        className="h-9 w-9 shrink-0 rounded-[10px]"
        style={{
          background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
        }}
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Text
            as="h1"
            variant="title"
            className="min-w-0 truncate text-[15.5px]"
          >
            {pack.title}
          </Text>
          <Badge className="shrink-0">{t("soloMode")}</Badge>
        </div>
        <Text
          variant="tertiary"
          className="truncate text-[12px] max-[720px]:hidden"
        >
          {packMeta}
        </Text>
      </div>

      <Text
        variant="secondary"
        className="ms-auto shrink-0 text-[13.5px] tabular-nums text-foreground-secondary"
      >
        {roundLabel}
      </Text>
    </div>
  );
}
