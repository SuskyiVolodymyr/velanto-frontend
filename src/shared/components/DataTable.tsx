"use client";

import { Children, type ReactNode } from "react";
import { Text } from "@/src/shared/components/Text";

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
}: {
  columns: string;
  headers: string[];
  children: ReactNode;
  /** Shown instead of the rows when there are none. */
  empty: string;
  isEmpty: boolean;
}) {
  return (
    <div
      role="table"
      className="overflow-hidden rounded-[16px] border border-border"
    >
      <div
        role="row"
        className="grid gap-3 bg-white/[0.03] px-[18px] py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary"
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
          <Text
            role="cell"
            variant="tertiary"
            className="p-10 text-center text-sm"
          >
            {empty}
          </Text>
        </div>
      ) : (
        children
      )}
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
export function DataTableRow({
  columns,
  children,
}: {
  columns: string;
  children: ReactNode;
}) {
  return (
    <div
      role="row"
      className="grid items-center gap-3 border-t border-white/[0.05] px-[18px] py-[13px]"
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
