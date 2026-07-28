"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { PackCard } from "@/src/features/home/PackCard";
import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import { PACK_STATUSES, type Pack, type PackStatus } from "@/src/shared/types/pack";
import { useAuthorPacks } from "./api/author-packs.queries";

// "all" is the UI sentinel for "no status filter" (every status) — same
// convention as MyPacksFeed's StatusChoice.
type StatusChoice = "all" | PackStatus;

// PACK_STATUSES -> the `status` catalog's packXxx label keys (same 4 labels
// MyPacksFeed already reuses for its own status filter — no new i18n).
const STATUS_LABEL_KEY: Record<PackStatus, string> = {
  draft: "packDraft",
  pending: "packPending",
  approved: "packApproved",
  rejected: "packRejected",
};

/**
 * An author's packs as a responsive grid with a "Load more" button that
 * appends the next page (see AUTHOR_PACKS_PAGE_SIZE). Seeded with the first
 * page the caller already has (from the combined author query or SSR), so it
 * renders immediately without a mount fetch. `own` shows moderation status
 * badges and a status filter chip row — the current user viewing their own
 * packs sees pending/rejected ones; a public visitor sees only approved
 * packs and no filter row.
 *
 * This is a tab-panel body (rendered inside `ProfileTabs`' "Packs" tab, T2),
 * not a titled section — no `<h2>` here, the tab label already says "Packs".
 *
 * The status filter (D13 of the profile/preferences redesign plan) is
 * client-side only: `useAuthorPacks` has no `status` query param, so
 * filtering is a plain `.filter()` over whatever's already been fetched.
 * "Load more" is unaffected by the active filter — it always calls
 * `fetchNextPage()` against the real, unfiltered query, exactly as before.
 */
export function AuthorPackList({
  authorId,
  initialPacks,
  initialTotal,
  own = false,
}: {
  authorId: string;
  initialPacks: Pack[];
  initialTotal: number;
  own?: boolean;
}) {
  const t = useTranslations("profile");
  const tMyPacks = useTranslations("myPacks");
  const tStatus = useTranslations("status");
  const [statusFilter, setStatusFilter] = useState<StatusChoice>("all");

  const query = useAuthorPacks(authorId, {
    items: initialPacks,
    total: initialTotal,
  });

  const packs = query.data?.pages.flatMap((page) => page.items) ?? initialPacks;
  // react-query derives this from getNextPageParam, so it stays correct even if
  // the server's total shrinks mid-session (a deleted pack), unlike a plain
  // packs.length < total check which could leave an inert button on screen.
  const hasMore = query.hasNextPage;

  // Own profile only (D13) — a visitor never sees the filter row, matching
  // the mock's isOwn gating.
  const visiblePacks = useMemo(
    () =>
      own && statusFilter !== "all"
        ? packs.filter((pack) => pack.status === statusFilter)
        : packs,
    [own, statusFilter, packs],
  );

  const statusOptions: { value: StatusChoice; label: string }[] = [
    { value: "all", label: tMyPacks("all") },
    ...PACK_STATUSES.map((status) => ({
      value: status,
      label: tStatus(STATUS_LABEL_KEY[status]),
    })),
  ];

  const isFilteredEmpty =
    own && statusFilter !== "all" && packs.length > 0 && visiblePacks.length === 0;

  return (
    <>
      {own && (
        <FilterChipRow
          options={statusOptions}
          value={statusFilter}
          onSelect={setStatusFilter}
        />
      )}

      {packs.length === 0 ? (
        <Text variant="secondary" className={own ? "mt-4" : undefined}>
          {own ? t("noPacksOwn") : t("noPacks")}
        </Text>
      ) : (
        <>
          {isFilteredEmpty ? (
            <Text variant="secondary" className="mt-4">
              {tMyPacks("emptyFiltered")}
            </Text>
          ) : (
            <div
              className={cn(
                "grid grid-cols-[repeat(auto-fill,minmax(262px,1fr))] gap-[18px]",
                own && "mt-4",
              )}
            >
              {visiblePacks.map((pack) => (
                <PackCard key={pack.id} pack={pack} showStatus={own} />
              ))}
            </div>
          )}

          {/* Independent of the filtered view above: Load more always fetches
              the real, unfiltered next page (D13) even if the active filter
              currently matches nothing already-loaded — otherwise a user
              filtering to a status only present on a later page would have no
              way to reach it. */}
          {hasMore && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                variant="secondary"
                loading={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                {query.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
              </Button>
              {query.isError && (
                <Text variant="danger" className="text-sm">
                  {t("loadMoreError")}
                </Text>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
