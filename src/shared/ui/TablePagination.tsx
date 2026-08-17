"use client";

import { useTranslations } from "next-intl";

/**
 * "Showing 1–20 of 132" plus Prev/Next, per the design. A simple two-button
 * pager (not the home feed's numbered one) — staff lists are scanned and
 * filtered, not browsed page-by-page. `pageSize` is a prop rather than a shared
 * constant: it belongs to whichever list is being paged, and shared/ can't
 * reach into a feature to read it.
 */
export function TablePagination({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("common");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* A plain span, not <Text>: the mock sets this range in the mono face
          (`data-mono`), which is a DOM attribute the Text primitive's props
          don't carry. */}
      <span data-mono className="text-xs text-foreground-tertiary">
        {t("showing", { first, last, total })}
      </span>
      <div className="flex gap-2">
        <PagerButton
          label={t("prev")}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <PagerButton
          label={t("next")}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </div>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-[34px] rounded-[9px] border border-border bg-white/[0.05] px-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.05]"
    >
      {label}
    </button>
  );
}
