export type PaginationItem = number | "ellipsis";

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Build the sequence of page tokens a pager renders: always the first page, the
 * last page, the current page, and the current page's immediate neighbors. Any
 * run of hidden pages between two shown ones collapses to a single "ellipsis"
 * token. Small counts (<= 7) fit entirely, so they list every page and never
 * ellipsize. Callers should skip rendering the pager altogether when
 * totalPages <= 1.
 */
export function buildPaginationRange(
  page: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 7) {
    return range(1, totalPages);
  }

  const anchors = [1, totalPages, page, page - 1, page + 1];
  const visible = [...new Set(anchors)]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const items: PaginationItem[] = [];
  let previous = 0;
  for (const p of visible) {
    if (p - previous > 1) items.push("ellipsis");
    items.push(p);
    previous = p;
  }
  return items;
}
