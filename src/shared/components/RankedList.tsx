"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";

export interface RankedRow {
  /** The item's id — a stable key, never rendered. */
  id: string;
  title: string;
  /**
   * Where the item came in the DRAW, 0-based. Ranking blind means the order
   * items arrived in is what the player was reacting to, and this list is
   * ordered by where they ended up — so without it a round can't be read back.
   * Omitted for plays recorded before #338, which never stored it.
   */
  drawIndex?: number;
}

/**
 * One finished rank_blind round: first place to last.
 *
 * Shared by the play screen's between-rounds recap and the result screen so a
 * player meets the same list twice — the recap used to be its own plainer
 * layout, which read as a different kind of thing than the result it becomes.
 *
 * The "shown at" copy lives in the `result` namespace, its first home; the
 * whole catalog is on the client, so reading it from the play screen is safe.
 */
export function RankedList({ rows }: { rows: RankedRow[] }) {
  const t = useTranslations("result");

  return (
    <ul className="flex flex-col gap-2 rounded-xl border border-border p-3">
      {rows.map((row, index) => (
        <li
          key={row.id}
          className="flex min-w-0 items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
        >
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold tabular-nums">
            {index + 1}
          </span>
          <Text className="flex-1 truncate text-sm font-semibold">
            {row.title}
          </Text>
          {row.drawIndex !== undefined && (
            <Text variant="tertiary" className="flex-none text-xs tabular-nums">
              {t("shownAt", { n: row.drawIndex + 1 })}
            </Text>
          )}
        </li>
      ))}
    </ul>
  );
}
