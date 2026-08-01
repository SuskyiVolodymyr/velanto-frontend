import { useFormatter, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
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
 * The result page's hero card: a cyan-tinted highlight panel with a check
 * badge, eyebrow, the page's one `h1`, a fixed "picks recorded" note, and a
 * compact rounds/plays stat row pinned to the end — matches the real mock
 * (`Results.dc.html`) exactly, including its gradient/border treatment.
 *
 * The pack's own title is NOT rendered here (mock never puts it in the hero,
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
    <div className="flex flex-wrap items-center gap-[18px] rounded-[20px] border border-acc/30 bg-gradient-to-br from-acc/[0.12] to-acc/[0.02] p-[22px]">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[17px] bg-acc/[0.16] text-acc-hover"
      >
        <Check size={26} strokeWidth={2} />
      </span>
      <div className="flex min-w-0 flex-col gap-[5px]">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-acc-hover">
          {t("label")}
        </span>
        <Text
          as="h1"
          variant="title"
          className="text-pretty text-[30px] font-bold leading-[1.06] tracking-[-0.025em] max-[720px]:text-[26px]"
        >
          {t(shared ? titleKey.shared : titleKey.own)}
        </Text>
        <Text variant="secondary" className="text-pretty text-[13.5px]">
          {t(shared ? "heroSubtitleFixedShared" : "heroSubtitleFixed")}
        </Text>
      </div>
      {/* The mock's `heroStats`, rendered INSIDE the card beside the message
          rather than as its own row above or below it. */}
      <div className="ms-auto flex gap-[22px]">
        <CompactStat label={t("statRoundsCompact")} value={totalRounds} />
        <CompactStat label={t("statPlaysCompact")} value={totalPlays} />
      </div>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: number }) {
  const format = useFormatter();
  return (
    <div className="flex flex-col gap-[3px]">
      <Text className="font-mono text-[22px] font-bold tracking-[-0.01em] tabular-nums">
        {/* Mock shows "2,142" — a four-figure play count without grouping
            reads as an id, not a quantity. */}
        {format.number(value)}
      </Text>
      <Text
        variant="tertiary"
        className="text-[11px] font-semibold uppercase tracking-[0.06em]"
      >
        {label}
      </Text>
    </div>
  );
}
