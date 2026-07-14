"use client";

import type { ReactNode } from "react";
import { Text } from "@/src/shared/components/Text";

/**
 * The bordered, header-topped table shell the Staff / Users / Logs tabs share.
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
export function AdminTable({
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
        <Text variant="tertiary" className="p-10 text-center text-sm">
          {empty}
        </Text>
      ) : (
        children
      )}
    </div>
  );
}

/** One row of an {@link AdminTable}. `columns` must match the table's track list. */
export function AdminTableRow({
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
      {children}
    </div>
  );
}
