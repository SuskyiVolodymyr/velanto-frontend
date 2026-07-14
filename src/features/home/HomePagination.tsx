"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";
import { buildPaginationRange } from "@/src/features/home/pagination-range";

const stepButton =
  "inline-flex h-10 items-center gap-1 rounded-[10px] border border-border " +
  "bg-transparent px-3 text-sm text-foreground transition-colors " +
  "hover:border-border-strong disabled:opacity-40 " +
  "disabled:pointer-events-none focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background";

const pageButtonBase =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-[10px] " +
  "border px-2 text-sm transition-colors focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background";

/**
 * Numbered page controls for the home feed. Presentational: it owns no page
 * state, just renders the current page (via {@link buildPaginationRange}) and
 * reports clicks through `onPageChange`. Renders nothing for a single page, so
 * the caller can mount it unconditionally.
 */
export function HomePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("home");
  if (totalPages <= 1) return null;

  const items = buildPaginationRange(page, totalPages);

  return (
    <nav
      aria-label={t("pagination")}
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        className={stepButton}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft size={16} aria-hidden />
        {t("paginationPrevious")}
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
                ? "border-transparent bg-acc font-medium text-background"
                : "border-border bg-transparent text-foreground-secondary hover:border-border-strong hover:text-foreground",
            )}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className={stepButton}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        {t("paginationNext")}
        <ChevronRight size={16} aria-hidden />
      </button>
    </nav>
  );
}
