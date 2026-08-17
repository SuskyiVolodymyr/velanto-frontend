import { useTranslations } from "next-intl";
import type { PackOverview } from "@/src/shared/types/pack";

// Compact overview of the pack's ordered rounds as chips, each showing the
// round's name and how many items it draws. An unnamed round falls back to its
// pool's name (elimination, one slot) or "Round N" (versus) — and to "Random
// pool" when the pool is drawn at play time and so has no name to show here.
//
// Both the drawn count and the pool name arrive resolved from the API, which
// runs the same shared draw engine play and creation do. They used to be
// computed here from the pack's full pools, which meant downloading every item
// in the pack to render a row of chips.
export function RoundChips({ pack }: { pack: PackOverview }) {
  const t = useTranslations("pack");
  const rounds = pack.rounds ?? [];

  if (rounds.length === 0) return null;

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(214px,1fr))] gap-2.5">
      {rounds.map((round, index) => {
        // Both fallbacks are translated strings, which is why the API sends
        // the facts (name, poolName, randomPool) and not a finished label.
        const fallback = round.randomPool
          ? t("randomPoolLabel")
          : t("roundHeading", { index: index + 1 });
        const label = round.name?.trim() || round.poolName || fallback;

        return (
          <div
            key={round.id}
            className="flex items-center gap-3 rounded-[14px] border border-border bg-white/[0.02] px-3.5 py-3"
          >
            <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] bg-white/[0.06] text-[12.5px] font-semibold text-foreground-secondary">
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[14.5px] font-semibold">
                {label}
              </span>
              <span className="text-[11px] text-foreground-tertiary">
                {t("itemsCount", { count: round.itemsCount })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
