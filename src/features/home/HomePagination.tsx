"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";
import { buildPaginationRange } from "@/src/features/home/pagination-range";

/** The "Showing X–Y of Z packs" range shown beside the pager on the browse feed. */
export interface PaginationRange {
  first: number;
  last: number;
  total: number;
}

const stepButton =
  "grid h-9 w-9 place-items-center rounded-[10px] border border-white/[0.1] " +
  "bg-surface-card text-foreground-secondary transition-colors " +
  "hover:border-white/[0.24] hover:text-foreground disabled:opacity-40 " +
  "disabled:pointer-events-none focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-acc";

const pageButtonBase =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-[10px] border " +
  "px-2.5 text-[13px] font-[650] transition-colors focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-acc";

/**
 * Numbered page controls for a feed, with an optional "Showing X–Y of Z" range
 * label (2.0.0). Presentational: owns no page state, just renders the current
 * page (via {@link buildPaginationRange}) and reports clicks. With a
 * `rangeLabel` it uses the split browse layout (count left, pager right) and
 * still shows the count on a single page; without one it stays centered and
 * renders nothing when a single page covers everything.
 */
export function HomePagination({
  page,
  totalPages,
  onPageChange,
  rangeLabel,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  rangeLabel?: PaginationRange;
}) {
  const t = useTranslations("home");
  if (totalPages <= 1 && !rangeLabel) return null;

  const items = totalPages > 1 ? buildPaginationRange(page, totalPages) : [];

  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4",
        rangeLabel ? "justify-between" : "justify-center",
      )}
    >
      {rangeLabel && (
        <span className="text-[12.5px] text-foreground-tertiary">
          {t("showingRange", {
            first: rangeLabel.first,
            last: rangeLabel.last,
            total: rangeLabel.total,
          })}
        </span>
      )}

      {totalPages > 1 && (
        <nav
          aria-label={t("pagination")}
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            aria-label={t("paginationPrevious")}
            className={stepButton}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft size={16} aria-hidden />
          </button>

          {items.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden
                className="min-w-6 text-center text-foreground-tertiary"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  pageButtonBase,
                  item === page
                    ? "border-acc/45 bg-acc/[0.18] text-foreground"
                    : "border-white/[0.1] bg-surface-card text-foreground-secondary hover:border-white/[0.24] hover:text-foreground",
                )}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            ),
          )}

          <button
            type="button"
            aria-label={t("paginationNext")}
            className={stepButton}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}
