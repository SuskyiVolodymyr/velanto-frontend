"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";

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
    <div className="flex items-center justify-between gap-3">
      <Text variant="tertiary" className="text-xs">
        {t("showing", { first, last, total })}
      </Text>
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
      className="h-[34px] rounded-lg border border-border bg-white/[0.05] px-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.05]"
    >
      {label}
    </button>
  );
}
