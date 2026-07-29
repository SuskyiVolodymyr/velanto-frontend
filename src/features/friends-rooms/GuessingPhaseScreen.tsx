"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import type { RoomState } from "./room-types";

interface GuessingPhaseScreenProps {
  state: RoomState;
  onSubmit: (mapping: Record<string, string>) => void;
}

/**
 * The Guess-who endgame (design brief §4.3(d)/#2): assign each real player to
 * an anonymous label, submit once every label has a distinct assignment. A
 * native `<select>` per label, not drag-and-drop (see this plan's D2) — the
 * bijection is enforced here by clearing any OTHER label that already held the
 * player just picked, so two labels can never end up pointing at the same
 * person client-side (the server re-validates regardless, per
 * GUESS_REJECTION_REASONS.malformed).
 */
export function GuessingPhaseScreen({
  state,
  onSubmit,
}: GuessingPhaseScreenProps) {
  const t = useTranslations("room");
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const guessing = state.guessing;
  const usernameByUserId = useMemo(
    () => new Map(state.players.map((p) => [p.userId, p.username])),
    [state.players],
  );

  if (!guessing) return null;

  const alreadySubmitted = state.myGuess !== null;
  const complete = guessing.labels.every((label) => assignment[label]);

  function assign(label: string, userId: string) {
    if (!userId) {
      setAssignment((prev) => {
        const next = { ...prev };
        delete next[label];
        return next;
      });
      return;
    }
    setAssignment((prev) => {
      const next: Record<string, string> = {};
      for (const [existingLabel, existingUserId] of Object.entries(prev)) {
        if (existingUserId !== userId) next[existingLabel] = existingUserId;
      }
      next[label] = userId;
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Text variant="tertiary" className="text-xs uppercase tracking-wide">
          {t("guessing.heading")}
        </Text>
        <Text as="h2" variant="title" className="text-2xl">
          {t("guessing.title")}
        </Text>
        <Text variant="secondary" className="text-sm">
          {t("guessing.instruction")}
        </Text>
      </header>

      {alreadySubmitted ? (
        <Text variant="secondary" className="text-sm">
          {t("guessing.waitingForOthers", {
            count: guessing.submitted.length,
            total: state.players.length,
          })}
        </Text>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {/* Every label lists every candidate — an option already assigned
                to another label is NOT filtered out of the list here, because
                that's exactly how a reassignment happens: picking someone
                already assigned elsewhere is the swap gesture, and `assign()`
                below is what enforces the bijection by clearing that other
                label's own selection when it happens. Filtering the option
                out here would make a swap impossible to perform at all. */}
            {guessing.labels.map((label) => (
              <label key={label} className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-chip border border-acc/30 bg-acc/[0.12] font-mono text-sm font-bold text-acc">
                  {label}
                </span>
                <Text className="sr-only">{label}</Text>
                <select
                  aria-label={label}
                  value={assignment[label] ?? ""}
                  onChange={(event) => assign(label, event.target.value)}
                  className="h-11 flex-1 rounded-control border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc"
                >
                  <option value="">{t("guessing.chooseSomeone")}</option>
                  {guessing.candidateUserIds.map((userId) => (
                    <option key={userId} value={userId}>
                      {usernameByUserId.get(userId) ?? userId}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <Button
            disabled={!complete}
            onClick={() => onSubmit(assignment)}
            className="self-end"
          >
            {t("guessing.submit")}
          </Button>
        </>
      )}
    </div>
  );
}
