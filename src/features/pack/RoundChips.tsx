import { useTranslations } from "next-intl";
import type { Pack } from "@/src/shared/types/pack";
import { resolveRoundDraws } from "@/src/shared/lib/round-draw";

// Compact overview of the pack's ordered rounds as chips, each showing the
// round's name and how many items it draws. An unnamed round falls back to its
// pool's name (elimination, one slot) or "Round N" (versus) — and to "Random
// pool" when the pool is drawn at play time and so has no name to show here.
// The drawn count comes from the shared resolveRoundDraws engine so it matches
// play/creation.
export function RoundChips({ pack }: { pack: Pack }) {
  const t = useTranslations("pack");
  const rounds = pack.rounds ?? [];
  const groups = pack.groups ?? [];

  if (rounds.length === 0) return null;

  const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
  const resolved = resolveRoundDraws(groups, rounds);

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(214px,1fr))] gap-2.5">
      {rounds.map((round, index) => {
        const drawn =
          resolved[index]?.slots.reduce(
            (sum, slot) => sum + slot.drawnCount,
            0,
          ) ?? 0;
        const heading = t("roundHeading", { index: index + 1 });
        const soleSlot = round.slots.length === 1 ? round.slots[0] : undefined;
        const fallback = !soleSlot
          ? heading
          : soleSlot.groupMode === "random"
            ? t("randomPoolLabel")
            : (groupNameById.get(soleSlot.groupId ?? "") ?? heading);
        const label = round.name?.trim() || fallback;

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
                {t("itemsCount", { count: drawn })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
