"use client";

import { Text } from "@/src/shared/components/Text";
import { ADMIN_PAGE_SIZE } from "@/src/features/admin/api/admin";

/**
 * "Showing 1–20 of 132" plus Prev/Next, per the design. A simple two-button
 * pager (not the home feed's numbered one) — admin lists are scanned and
 * filtered, not browsed page-by-page.
 */
export function AdminPagination({
  page,
  total,
  onPageChange,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  if (total === 0) return null;

  const first = (page - 1) * ADMIN_PAGE_SIZE + 1;
  const last = Math.min(page * ADMIN_PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between gap-3">
      <Text variant="tertiary" className="text-xs">
        Showing {first}–{last} of {total}
      </Text>
      <div className="flex gap-2">
        <PagerButton
          label="Prev"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <PagerButton
          label="Next"
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
