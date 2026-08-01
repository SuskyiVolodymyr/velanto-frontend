"use client";

import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { MODE_ICON, MODE_NAME_KEY, MODE_STEP_KEYS } from "./room-mode-copy";
import { ICON_BY_NAME } from "./mode-icons";
import type { RoomMode } from "./room-types";

/**
 * "How a round goes" — three steps for whichever mode is currently selected,
 * under the picker (Room Lobby.dc.html).
 *
 * The lobby is where a room decides what game it is playing, and the blurb on a
 * picker card is one line; this is the panel that actually answers "what will I
 * be doing?" before anyone commits. Renders nothing while no mode is chosen —
 * there is no round to describe yet.
 */
export function ModeHowItWorks({ mode }: { mode: RoomMode | null }) {
  const t = useTranslations("room");
  if (!mode) return null;

  const ModeIcon = ICON_BY_NAME[MODE_ICON[mode]];
  return (
    <section
      aria-label={t("lobby.howARoundGoes")}
      className="flex flex-col gap-[13px] rounded-card border border-border bg-surface-card p-[18px]"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] bg-acc/[0.14] text-acc-hover">
          {ModeIcon && <ModeIcon size={16} aria-hidden />}
        </span>
        <Text as="h2" className="text-[15px] font-bold">
          {t(MODE_NAME_KEY[mode])}
        </Text>
        <Text variant="tertiary" className="ms-auto text-xs">
          {t("lobby.howARoundGoes")}
        </Text>
      </div>

      <ol className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        {MODE_STEP_KEYS[mode].map((key, i) => (
          <li
            key={key}
            className="flex gap-2.5 rounded-[13px] border border-border bg-background p-3"
          >
            <span className="font-mono text-[11.5px] font-bold text-acc">
              {i + 1}
            </span>
            <span className="flex flex-col gap-[3px]">
              <Text className="text-[12.5px] font-semibold">
                {t(`${key}.title`)}
              </Text>
              <Text
                variant="tertiary"
                className="text-[11.5px] leading-[1.45] text-pretty"
              >
                {t(`${key}.body`)}
              </Text>
            </span>
          </li>
        ))}
      </ol>

      {/* Voting is the only mode with a tiebreak holder. The mock names the
          player who starts with priority; the server assigns the rotation when
          the game STARTS, so in the lobby there is genuinely nobody to name —
          this explains the mechanic instead of inventing a holder. */}
      {mode === "voting" && (
        <div className="flex items-center gap-[11px] rounded-[13px] border border-score/25 bg-score/[0.07] p-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-score/[0.16] text-score">
            <Crown size={16} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <Text className="text-[12.5px] font-bold text-score">
              {t("lobby.priorityTitle")}
            </Text>
            <Text
              variant="secondary"
              className="text-[11.5px] leading-[1.4] text-pretty"
            >
              {t("lobby.priorityBody")}
            </Text>
          </span>
        </div>
      )}
    </section>
  );
}
