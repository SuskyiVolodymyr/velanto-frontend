"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import { HomePagination } from "@/src/features/home/HomePagination";
import { PackCard } from "@/src/features/home/PackCard";
import {
  PACK_GRID_CLASS,
  PackGridSkeleton,
} from "@/src/features/home/PackGridSkeleton";
import { Text } from "@/src/shared/components/Text";
import { useMyPacks } from "@/src/features/home/api/my-packs.queries";
import { PACKS_FEED_PAGE_SIZE } from "@/src/features/home/api/packs-feed";
import {
  DATE_ORDER_LABEL_KEYS,
  DATE_ORDER_VALUES,
  DEFAULT_DATE_ORDER,
  type DateOrderValue,
} from "@/src/features/home/filter-options";
import type { PackStatus } from "@/src/shared/types/pack";

// "all" is the UI sentinel for "no status filter" (every status).
type StatusChoice = "all" | PackStatus;

/**
 * The signed-in author's own packs across every moderation status, filterable
 * by a status chip row. Each card carries a status badge (via `showStatus`) so
 * drafts / pending / rejected read at a glance. Mounted by the `/my-packs`
 * route, which the sidebar only exposes to signed-in users (a signed-out click
 * routes to /auth) — the login fallback here is a belt-and-braces guard.
 */
export function MyPacksFeed() {
  const t = useTranslations("myPacks");
  const tStatus = useTranslations("status");
  const tHome = useTranslations("home");
  const { user } = useAuth();

  const [status, setStatus] = useState<StatusChoice>("all");
  const [dateOrder, setDateOrder] =
    useState<DateOrderValue>(DEFAULT_DATE_ORDER);
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      sort: dateOrder,
      page,
    }),
    [status, dateOrder, page],
  );
  const query = useMyPacks(user?.id ?? "", filters);

  const packs = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PACKS_FEED_PAGE_SIZE));

  const statusOptions: { value: StatusChoice; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "approved", label: tStatus("packApproved") },
    { value: "draft", label: tStatus("packDraft") },
    { value: "pending", label: tStatus("packPending") },
    { value: "rejected", label: tStatus("packRejected") },
  ];

  function selectStatus(next: StatusChoice) {
    setStatus(next);
    // A new filter is a fresh view — restart at page 1 so narrowing while deep
    // in the list can't strand the user on an out-of-range page.
    setPage(1);
  }

  function selectDateOrder(next: DateOrderValue) {
    setDateOrder(next);
    setPage(1);
  }

  const dateOrderOptions = DATE_ORDER_VALUES.map((value) => ({
    value,
    label: tHome(DATE_ORDER_LABEL_KEYS[value]),
  }));

  function goToPage(next: number) {
    setPage(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (!user) {
    return <Text variant="secondary">{t("loginRequired")}</Text>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChipRow
          options={statusOptions}
          value={status}
          onSelect={selectStatus}
        />
        {/* Right-aligned against the status chips, like the discovery feed's
            secondary filters — wraps to its own left-aligned row on narrow
            screens once the status chips no longer share the line. */}
        <div className="ms-auto max-[480px]:ms-0">
          <FilterChipRow
            options={dateOrderOptions}
            value={dateOrder}
            onSelect={selectDateOrder}
          />
        </div>
      </div>

      {query.isError ? (
        <Text variant="danger">{t("error")}</Text>
      ) : query.isLoading ? (
        <PackGridSkeleton label={t("loading")} />
      ) : packs.length === 0 ? (
        <Text variant="secondary">
          {status === "all" ? t("empty") : t("emptyFiltered")}
        </Text>
      ) : (
        <>
          <div className={PACK_GRID_CLASS}>
            {packs.map((pack) => (
              <PackCard key={pack.id} pack={pack} showStatus />
            ))}
          </div>
          <HomePagination
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </>
      )}
    </div>
  );
}
