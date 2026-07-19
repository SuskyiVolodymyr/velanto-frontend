"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import { HomePagination } from "@/src/features/home/HomePagination";
import { PackCard } from "@/src/features/home/PackCard";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { useMyPacks } from "@/src/features/home/api/my-packs.queries";
import { PACKS_FEED_PAGE_SIZE } from "@/src/features/home/api/packs-feed";
import type { PackStatus } from "@/src/shared/types/pack";

// "all" is the UI sentinel for "no status filter" (every status).
type StatusChoice = "all" | PackStatus;

/**
 * The "My packs" tab: the signed-in author's own packs across every moderation
 * status, filterable by a status chip row. Each card carries a status badge (via
 * `showStatus`) so drafts / pending / rejected read at a glance. Sits beside the
 * public discovery feed in {@link BrowseTabs}, which only mounts it when signed
 * in — the login fallback here is a belt-and-braces guard.
 */
export function MyPacksFeed() {
  const t = useTranslations("myPacks");
  const tStatus = useTranslations("status");
  const { user } = useAuth();

  const [status, setStatus] = useState<StatusChoice>("all");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({ status: status === "all" ? undefined : status, page }),
    [status, page],
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
      <FilterChipRow
        options={statusOptions}
        value={status}
        onSelect={selectStatus}
      />

      {query.isError ? (
        <Text variant="danger">{t("error")}</Text>
      ) : query.isLoading ? (
        <LoadingState label={t("loading")} showLabel />
      ) : packs.length === 0 ? (
        <Text variant="secondary">
          {status === "all" ? t("empty") : t("emptyFiltered")}
        </Text>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
