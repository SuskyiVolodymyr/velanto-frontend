"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";

export interface ResumePlayModalProps {
  open: boolean;
  onContinue: () => void;
  onRestart: () => void;
  /** Rounds completed in the saved play — shown via the shared
   * `roundsDoneNote` copy for context. */
  roundsDone: number;
}

/**
 * The resume-choice prompt every play screen shows when it finds a saved,
 * in-progress play (see `usePlayResume`'s `needsChoice`). Deliberately NOT
 * built on the shared {@link Modal} primitive: that one is dismissable
 * (Escape, backdrop click, a close button), and there is no safe "do
 * nothing" option here — the screen behind it shows no round content until
 * the player picks one of these two actions, so `role="alertdialog"` rather
 * than `dialog`.
 */
export function ResumePlayModal({
  open,
  onContinue,
  onRestart,
  roundsDone,
}: ResumePlayModalProps) {
  const t = useTranslations("play");
  const titleId = useId();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-md flex-col gap-4 rounded-card border border-border bg-surface-card p-[18px]"
      >
        <div className="flex flex-col gap-1.5">
          <Text as="h2" id={titleId} variant="title" className="text-lg">
            {t("resumeModalTitle")}
          </Text>
          <Text variant="tertiary" className="text-[11.5px] tabular-nums">
            {t("roundsDoneNote", { count: roundsDone })}
          </Text>
        </div>
        <Text variant="secondary" className="text-sm leading-relaxed">
          {t("resumeModalBody")}
        </Text>
        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" onClick={onRestart}>
            {t("resumeRestart")}
          </Button>
          <Button variant="primary" onClick={onContinue}>
            {t("resumeContinue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
