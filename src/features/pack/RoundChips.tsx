import { useTranslations } from "next-intl";
import type { Pack } from "@/src/shared/types/pack";

// Compact overview of the pack's pools (groups) as chips showing each pool's
// name and how many items it holds — the design's "rounds" strip, replacing the
// old full item-list cards. Uniform across formats now (pools-and-rounds).
export function RoundChips({ pack }: { pack: Pack }) {
  const t = useTranslations("pack");
  const sections = pack.groups;

  if (sections.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2.5">
      {sections.map((section) => (
        <div
          key={section.id}
          className="flex min-w-[86px] flex-col gap-1 rounded-[11px] border border-border bg-white/[0.025] px-3.5 py-2.5"
        >
          <span className="text-[14.5px] font-semibold">{section.name}</span>
          <span className="text-[11px] text-foreground-tertiary">
            {t("itemsCount", { count: section.items.length })}
          </span>
        </div>
      ))}
    </div>
  );
}
