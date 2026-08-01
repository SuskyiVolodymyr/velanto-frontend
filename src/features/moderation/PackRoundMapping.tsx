import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import {
  MarkForEditButton,
  MarkRequestField,
} from "@/src/features/moderation/MarkForEdit";
import type { PackMarks } from "@/src/features/moderation/use-pack-marks";
import type { Pack } from "@/src/shared/types/pack";

/**
 * The pack-review screen's round→pool mapping list: for each round, which
 * pool(s) its slots draw from (or "random" for a random-mode slot with no
 * fixed pool identity worth naming here — the actual random-vs-manual item
 * breakdown lives in `PackContentsPreview`/D10, this list is just the
 * at-a-glance mapping). Renders nothing for a pack with zero rounds.
 */
export function PackRoundMapping({
  pack,
  marks,
}: {
  pack: Pack;
  /**
   * Approval mode: each round can be marked for edit, which is how a moderator
   * asks for a round to be renamed or re-pointed without rejecting the pack.
   * Omitted on the report screens, where marking is not an outcome.
   */
  marks?: PackMarks;
}) {
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
              className="flex flex-col gap-2 rounded-[12px] border border-border bg-white/[0.02] px-4 py-2.5 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">{label}</span>
                <span className="ms-auto text-foreground-tertiary">
                  {poolNames.join(" vs ")}
                </span>
                {marks && (
                  <MarkForEditButton
                    marks={marks}
                    target={{ kind: "round", id: round.id, label }}
                  />
                )}
              </div>
              {marks && (
                <MarkRequestField
                  marks={marks}
                  target={{ kind: "round", id: round.id, label }}
                  placeholder={t("markRoundPlaceholder")}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
