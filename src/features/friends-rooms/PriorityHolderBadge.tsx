"use client";

import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { Text } from "@/src/shared/components/Text";

/**
 * The rotating tiebreak role's badge (design brief §3.2) — shown BEFORE
 * voting closes so the room knows whom to persuade on a tie. `--score` (game
 * amber: "score, priority, winner") per design-tokens.md, distinct from the
 * moderation-status amber family.
 */
export function PriorityHolderBadge({ username }: { username: string }) {
  const t = useTranslations("room");
  return (
    <div className="flex items-center gap-2 rounded-pill border border-score/30 bg-score/10 px-3 py-1.5">
      <Crown size={14} aria-hidden className="text-score" />
      {/* Plain <span>, not <Text>, for the amber-colored piece — Text always
          applies a variant color class of equal specificity to any color
          className passed alongside it (see Text.tsx's own documented
          gotcha, also hit in Tasks 10 and 17). */}
      <span className="text-xs font-semibold text-score">
        {t("priority.holder", { name: username })}
      </span>
      <Text variant="tertiary" className="text-[11px]">
        {t("priority.explainer")}
      </Text>
    </div>
  );
}
