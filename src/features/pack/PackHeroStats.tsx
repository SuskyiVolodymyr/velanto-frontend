import { useTranslations } from "next-intl";
import { getRoundsCount } from "@/src/shared/lib/pack-display";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";

// Compact number formatting for the stat tiles: 1_280 -> "1.3k", 128_000 -> "128k".
function humanize(n: number): string {
  if (n < 1000) return String(n);
  const thousands = n / 1000;
  const rounded =
    thousands >= 100 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
  return `${rounded}k`;
}

// The plays / rounds / agreement trio shown beside the pack description,
// mirroring the design's stat cluster (we don't track a distinct "players"
// count, so rounds stands in for it).
export function PackHeroStats({ pack }: { pack: Pack }) {
  const t = useTranslations("pack");
  const rounds = getRoundsCount(pack);
  const stats = [
    { value: humanize(pack.totalPlays), label: t("statPlays") },
    { value: String(rounds), label: t("statRoundsLabel") },
    {
      value: `${Math.round(pack.avgAgreementPercent)}%`,
      label: t("statAgree"),
      accent: true,
    },
  ];

  return (
    <div className="flex flex-wrap gap-[26px] pt-1.5 max-[720px]:gap-[14px]">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-0.5">
          <div
            className={cn(
              "text-xl font-bold tabular-nums tracking-[-0.01em]",
              stat.accent && "text-acc",
            )}
          >
            {stat.value}
          </div>
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-foreground-tertiary">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
