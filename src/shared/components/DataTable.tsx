"use client";

import { Children, type ReactNode } from "react";
import { cn } from "@/src/shared/lib/cn";

/**
 * The bordered, header-topped table shell the admin and moderation panels share.
 *
 * A CSS grid rather than a real <table>: the design gives each tab its own
 * fixed column track sizes (e.g. "1.3fr 130px 1fr 110px 90px") and rows whose
 * cells are links, selects and buttons — none of which a <table> lays out as
 * cleanly. `role="table"` and friends keep it a table to assistive tech, so we
 * lose nothing but the tag.
 *
 * `columns` is the grid-template-columns track list; `headers` must have the
 * same length (pass "" for an action column with no heading).
 */
export function DataTable({
  columns,
  headers,
  children,
  empty,
  isEmpty,
  minWidth = "42rem",
}: {
  columns: string;
  headers: string[];
  children: ReactNode;
  /**
   * Shown instead of the rows when there are none. A node, not a string: the
   * pack queue's empty state is the mock's icon tile above its line, while the
   * report queue's is a single centred sentence.
   */
  empty: ReactNode;
  isEmpty: boolean;
  /**
   * Floor width for the table's fixed-px columns. Below it (e.g. a phone) the
   * outer wrapper scrolls horizontally instead of clipping the right-hand
   * columns; above it the table just fills its container, so desktop is
   * unchanged. The scroll wrapper sits OUTSIDE role="table" so the table still
   * owns its role="row" children directly (valid ARIA).
   */
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <div
        role="table"
        className="overflow-hidden rounded-[16px] border border-border bg-surface-card"
        style={{ minWidth }}
      >
        <div
          role="row"
          className="grid gap-[14px] border-b border-border bg-white/[0.02] px-[18px] py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground-tertiary"
          style={{ gridTemplateColumns: columns }}
        >
          {headers.map((header, index) => (
            <span
              role="columnheader"
              // Headers are a fixed, ordered list per table, so the index is a
              // stable key — and blank action columns would otherwise collide.
              key={index}
            >
              {header}
            </span>
          ))}
        </div>
        {isEmpty ? (
          <div role="row">
            <div
              role="cell"
              className="px-[18px] py-11 text-center text-[13.5px] text-foreground-tertiary"
            >
              {empty}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * One row of a {@link DataTable}. `columns` must match the table's track list.
 *
 * Each child becomes one cell. Callers pass the cell *contents* — the row wraps
 * them, so a row's children are its columns, in order. The wrapper carries
 * `min-w-0` because a grid item defaults to `min-width: auto`, which refuses to
 * shrink below its content and so defeats `truncate` on anything inside it.
 */
/**
 * Put this on the single `<Link>` inside a `linked` {@link DataTableRow}: its
 * hit area then stretches over the whole row, so clicking anywhere in the row
 * follows that link.
 *
 * This is how the mock's whole-row-clickable report rows are built without
 * making the row itself an `<a>`. An `<a role="row">` would satisfy the table's
 * ARIA but silently drop the link role — the row would no longer be announced
 * as a link at all, which is the trade the previous "one link per row" layout
 * was written to avoid. Here the row stays a `role="row"` div, exactly one real
 * link keeps its own accessible name, and the pointer target is the full row.
 *
 * The overlay covers the row's other cells, so their text is no longer
 * selectable — acceptable for a queue row whose whole job is to be opened, and
 * the reason this is opt-in per row rather than automatic.
 */
export const ROW_LINK_CLASS = "after:absolute after:inset-0 after:content-['']";

export function DataTableRow({
  columns,
  linked,
  onClick,
  children,
}: {
  columns: string;
  /**
   * The row contains a stretched link (see {@link ROW_LINK_CLASS}): positions
   * the row so the overlay resolves against it, and gives it the pointer and
   * hover treatment of a clickable row.
   */
  linked?: boolean;
  /**
   * Pointer-clickable "open detail" target for rows that DO hold buttons (the
   * pack queue's Approve/Reject). A convenience layer for mouse users only —
   * it adds no keyboard/screen-reader path of its own (a `role="row"` div is
   * neither link nor button), so such a caller must also keep a real
   * `<Link>`/`<button>` cell inside the row as the accessible way in. Any
   * action button inside the row MUST call `event.stopPropagation()` in its
   * own `onClick` so clicking it doesn't also fire this and navigate away —
   * see PackApprovalsTab for the pattern.
   */
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="row"
      onClick={onClick}
      className={cn(
        "grid items-center gap-[14px] border-b border-white/[0.05] px-[18px] py-[14px]",
        linked && "relative",
        (linked || onClick) && "cursor-pointer hover:bg-white/[0.03]",
      )}
      style={{ gridTemplateColumns: columns }}
    >
      {/* toArray, not Children.map: it drops children that render nothing, so a
          TRAILING `{cond && <X/>}` cell can't leave an empty cell behind. But
          that also means a conditional cell in a MIDDLE position must not be a
          bare `&&` — dropping it would shift every later cell one track to the
          left. Give such a cell a `<span />` fallback (as the ban/remove
          columns do) so the cell count stays fixed. Each cell wraps its child
          in `min-w-0` so `truncate` works, but a `display:inline` child (a bare
          <a>/<Link>) still needs its own `block`/`inline-block` — it is no
          longer a grid item, so the grid won't blockify it for us. */}
      {Children.toArray(children).map((child, index) => (
        <div role="cell" className="min-w-0" key={index}>
          {child}
        </div>
      ))}
    </div>
  );
}
