import { useTranslations } from "next-intl";
import type { Pack } from "@/src/shared/types/pack";
import { resolveRoundDraws } from "@/src/shared/lib/round-draw";

// Compact overview of the pack's ordered rounds as chips, each showing the
// round's name and how many items it draws. An unnamed round falls back to its
// group's name (elimination, one slot) or "Round N" (versus). The drawn count
// comes from the shared resolveRoundDraws engine so it matches play/creation.
export function RoundChips({ pack }: { pack: Pack }) {
  const t = useTranslations("pack");
  const rounds = pack.rounds ?? [];
  const groups = pack.groups ?? [];

  if (rounds.length === 0) return null;

  const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
  const resolved = resolveRoundDraws(groups, rounds);

  return (
    <div className="flex flex-wrap gap-2.5">
      {rounds.map((round, index) => {
        const drawn =
          resolved[index]?.slots.reduce(
            (sum, slot) => sum + slot.drawnCount,
            0,
          ) ?? 0;
        const heading = t("roundHeading", { index: index + 1 });
        const fallback =
          round.slots.length === 1
            ? (groupNameById.get(round.slots[0]?.groupId ?? "") ?? heading)
            : heading;
        const label = round.name?.trim() || fallback;

        return (
          <div
            key={round.id}
            className="flex min-w-[86px] flex-col gap-1 rounded-[11px] border border-border bg-white/[0.025] px-3.5 py-2.5"
          >
            <span className="text-[14.5px] font-semibold">{label}</span>
            <span className="text-[11px] text-foreground-tertiary">
              {t("itemsCount", { count: drawn })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
