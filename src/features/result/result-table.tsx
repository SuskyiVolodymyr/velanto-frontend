import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

/**
 * The shared parts of the result screens' ranking tables — the podium colours
 * and the cell that draws them. Two tables use these (Top picked for the versus
 * and elimination formats, Podium finishes for rank_blind), and they have to
 * look like the same object: the medal is what a reader recognises first.
 */

/**
 * Outline and fill for each podium place; anything past third keeps the plain
 * border and surface.
 *
 * The two are chosen TOGETHER rather than layered, because `cn()` is a plain
 * join: appending `bg-medal-gold/10` to `bg-surface` leaves both classes on the
 * element and the cascade picks by stylesheet order, not class order (see
 * Text.tsx). Each place therefore names its own complete pair.
 */
const MEDAL_STYLES: Record<number, RowStyle> = {
  1: { border: "border-medal-gold", background: "bg-medal-gold/10" },
  2: { border: "border-medal-silver", background: "bg-medal-silver/10" },
  3: { border: "border-medal-bronze", background: "bg-medal-bronze/10" },
};

const PLAIN_STYLES: RowStyle = {
  border: "border-border",
  background: "bg-surface",
};

export interface RowStyle {
  border: string;
  background: string;
}

/**
 * Keyed on RANK, not row order: tied firsts are both gold and the next row is
 * third, so it takes bronze and silver goes unawarded — which is the point of
 * sharing a place.
 */
export function styleForRank(rank: number): RowStyle {
  return MEDAL_STYLES[rank] ?? PLAIN_STYLES;
}

/**
 * Competition ranking over an already-sorted list: equal scores share a place
 * and the next one skips accordingly (1, 1, 3). `scoreOf` returns the full key
 * a tie requires — two rows tie only when everything the table ranks on matches,
 * not just the headline number.
 */
export function withCompetitionRanks<T>(
  items: T[],
  scoreOf: (item: T) => string,
): (T & { rank: number })[] {
  let previousKey: string | null = null;
  let previousRank = 0;
  return items.map((item, index) => {
    const key = scoreOf(item);
    const rank = key === previousKey ? previousRank : index + 1;
    previousKey = key;
    previousRank = rank;
    return { ...item, rank };
  });
}

export function ColumnHeading({
  children,
  align = "start",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3",
        align === "end" ? "text-end" : "text-start",
        className,
      )}
    >
      <Text
        as="span"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        {children}
      </Text>
    </th>
  );
}

/**
 * A cell of a ranking table. The row's outline is drawn per CELL rather than on
 * the `tr`, because a border on a table row doesn't render with
 * `border-collapse: separate` — the rounded ends come from the first and last
 * cell dropping their inner edge.
 */
export function RankCell({
  children,
  style,
  align = "start",
  first = false,
  last = false,
}: {
  children: React.ReactNode;
  style: RowStyle;
  align?: "start" | "end";
  first?: boolean;
  last?: boolean;
}) {
  return (
    <td
      className={cn(
        "border-y px-3 py-3",
        style.border,
        style.background,
        align === "end" ? "text-end" : "text-start",
        first && cn("rounded-s-xl border-s", style.border),
        last && cn("rounded-e-xl border-e", style.border),
      )}
    >
      {children}
    </td>
  );
}
