"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import {
  MODE_NAME_KEY,
} from "@/src/features/friends-rooms/room-mode-copy";
import { ROOM_MODE_BOUNDS } from "@/src/features/friends-rooms/room-types";
import { usePreviewModes, type PreviewModesDraft } from "./use-preview-modes";

/**
 * The Create/Edit Pack form's live "Friend modes unlocked" panel — the real
 * mock (Create Pack.dc.html) this was missing entirely; see the removed
 * comment in CreateChecklistPanel.tsx for why it was deferred and why that
 * reasoning is now stale. Runs the SAME feasibility rules a saved pack's
 * PackModesPanel shows, against the author's live draft — see
 * usePreviewModes/PreviewModesDto for why that's a real backend round-trip
 * rather than a client-side reimplementation of the draw engines.
 *
 * Deliberately does NOT render a SCORED badge or a per-mode "Fix" shortcut
 * button, both present in the mock: `AvailableMode` (the real feasibility
 * shape) carries neither `scored` nor `fix`/`onFix` — guess-who's scoring was
 * dropped project-wide (see PackModesPanel's identical omission), and a
 * "fix" action would mean guessing, per mode, which section of the form to
 * jump the author to — there's no data to drive that honestly.
 */
export function CreateFeasibilityPanel({
  draft,
  debounceMs,
}: {
  draft: PreviewModesDraft;
  /** Test-only seam — production always uses usePreviewModes' own default. */
  debounceMs?: number;
}) {
  const t = useTranslations("create.feasibility");
  const tRoom = useTranslations("room");
  const { modes } = usePreviewModes(draft, { debounceMs });

  if (!modes || modes.length === 0) return null;

  const unlockedCount = modes.filter((entry) => entry.available).length;
  const allUnlocked = unlockedCount === modes.length;

  return (
    <div className="flex flex-col gap-[13px] rounded-[20px] border border-border bg-surface-card p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Text className="text-[15px] font-bold">{t("heading")}</Text>
          <span
            className={cn(
              "ms-auto rounded-full px-[9px] py-[3px] text-[11.5px] font-bold",
              allUnlocked
                ? "bg-[#39D98A]/[0.14] text-[#7EE7B4]"
                : "bg-[#FFC24B]/[0.14] text-[#FFD27A]",
            )}
          >
            {unlockedCount}/{modes.length}
          </span>
        </div>
        <Text
          variant="tertiary"
          className="text-[12px] leading-[1.45] text-pretty"
        >
          {t("subtitle")}
        </Text>
      </div>

      <div className="flex flex-col gap-2">
        {modes.map((entry) => (
          <div
            key={entry.mode}
            className={cn(
              "flex flex-col gap-[7px] rounded-[13px] border p-3",
              entry.available
                ? "border-white/[0.07] bg-[#0F1116]"
                : "border-[#FFC24B]/[0.24] bg-[#FFC24B]/[0.05]",
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={cn(
                  "flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[13px] font-bold leading-none",
                  entry.available
                    ? "bg-[#39D98A]/[0.18] text-[#7EE7B4]"
                    : "bg-[#FFC24B]/[0.16] text-[#FFD27A]",
                )}
              >
                {entry.available ? <Check size={12} strokeWidth={3.2} /> : "!"}
              </span>
              <Text
                className={cn(
                  "text-[13px] font-semibold",
                  !entry.available && "text-foreground/75",
                )}
              >
                {tRoom(MODE_NAME_KEY[entry.mode])}
              </Text>
            </div>
            <Text
              variant="tertiary"
              className="text-[11.5px] leading-[1.45] text-pretty"
            >
              {entry.available
                ? tRoom("modePicker.playerRange", {
                    min: ROOM_MODE_BOUNDS[entry.mode].minPlayers,
                    max: entry.maxPlayers,
                  })
                : entry.reason}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}
