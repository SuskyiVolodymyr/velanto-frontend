import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import type { Pack } from "@/src/shared/types/pack";

/**
 * The pack-review screen's round→pool mapping list: for each round, which
 * pool(s) its slots draw from (or "random" for a random-mode slot with no
 * fixed pool identity worth naming here — the actual random-vs-manual item
 * breakdown lives in `PackContentsPreview`/D10, this list is just the
 * at-a-glance mapping). Renders nothing for a pack with zero rounds.
 */
export function PackRoundMapping({ pack }: { pack: Pack }) {
  const t = useTranslations("moderation");

  if (pack.rounds.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <Text
        as="h2"
        variant="tertiary"
        className="text-[12px] font-bold uppercase tracking-[0.14em]"
      >
        {t("roundMappingHeading")}
      </Text>
      <ul className="flex flex-col gap-2">
        {pack.rounds.map((round, index) => {
          const poolNames = round.slots.map((slot) => {
            if (slot.groupMode === "random" || !slot.groupId) {
              return t("roundRandomPool");
            }
            return (
              pack.groups.find((group) => group.id === slot.groupId)?.name ??
              "—"
            );
          });
          const label =
            round.name?.trim() || t("roundLabelFallback", { index: index + 1 });
          return (
            <li
              key={round.id}
              className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-white/[0.02] px-4 py-2.5 text-sm"
            >
              <span className="font-medium text-foreground">{label}</span>
              <span className="text-foreground-tertiary">
                {poolNames.join(" vs ")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
