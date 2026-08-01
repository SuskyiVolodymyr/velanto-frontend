"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { FilterChipRow } from "@/src/features/home/FilterChipRow";
import { FormatFilter } from "@/src/features/home/FormatFilter";
import { HomePagination } from "@/src/features/home/HomePagination";
import { InProgressSection } from "@/src/features/home/InProgressSection";
import { PackCard } from "@/src/features/home/PackCard";
import {
  PACK_GRID_CLASS,
  PackGridSkeleton,
} from "@/src/features/home/PackGridSkeleton";
import { Text } from "@/src/shared/components/Text";
import { useHistory } from "@/src/features/home/api/history.queries";
import type { HistorySort } from "@/src/features/home/api/history";
import { PACKS_FEED_PAGE_SIZE } from "@/src/features/home/api/packs-feed";
import type { FormatFilterValue } from "@/src/features/home/filter-options";

const SORT_VALUES: HistorySort[] = ["recent", "oldest"];

/**
 * The signed-in user's play history: every pack they've played, ordered by when
 * they played it, each card dated by the play rather than by publication.
 *
 * Repeat plays of the same pack collapse to one card keyed on the latest play
 * (the backend's `groupBy`), so this is "packs you've played" rather than a
 * play-by-play log — replaying something moves it instead of duplicating it.
 *
 * Filtering and paging mirror My Packs, its sidebar sibling: a chip row on the
 * left, the ordering on the right, `PACKS_FEED_PAGE_SIZE` per page. Both
 * filters are applied by the API, not to the fetched page — filtering a single
 * page client-side would leave the pager counting rows it then hid.
 *
 * There's no status filter (unlike My Packs): the endpoint only ever returns
 * approved packs, so every chip but "all" would come back empty.
 */
export function HistoryFeed() {
  const t = useTranslations("history");
  const { user, status: authStatus } = useAuth();

  const [format, setFormat] = useState<FormatFilterValue>("all");
  const [sort, setSort] = useState<HistorySort>("recent");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({ format: format === "all" ? undefined : format, sort, page }),
    [format, sort, page],
  );
  const query = useHistory(user?.id ?? "", filters);

  const packs = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PACKS_FEED_PAGE_SIZE));

  function selectFormat(next: FormatFilterValue) {
    setFormat(next);
    // A new filter is a fresh view — restart at page 1 so narrowing while deep
    // in the list can't strand the user on an out-of-range page.
    setPage(1);
  }

  function selectSort(next: HistorySort) {
    setSort(next);
    setPage(1);
  }

  const sortOptions = SORT_VALUES.map((value) => ({
    value,
    label: t(value === "recent" ? "sortRecent" : "sortOldest"),
  }));

  // Only a KNOWN signed-out visitor gets the prompt — while the session is
  // still resolving, "log in to see your history" would be a lie to someone
  // who is in fact logged in.
  if (authStatus === "unauthenticated") {
    return <Text variant="secondary">{t("loginRequired")}</Text>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <FormatFilter value={format} onSelect={selectFormat} />
        {/* Right-aligned against the format chips, like My Packs' date order —
            wraps to its own left-aligned row once they no longer share a line. */}
        <div className="ms-auto max-[480px]:ms-0">
          <FilterChipRow
            options={sortOptions}
            value={sort}
            onSelect={selectSort}
          />
        </div>
      </div>

      {/* Unfinished plays, above the finished ones. Page 1 with no format
          filter only: these come from localStorage, not the paginated
          endpoint, so they belong to no page — and the resume snapshot stores
          no `format`, so a format chip can't honestly include or exclude
          them. Both conditions keep the section from claiming to be filtered
          when it isn't. */}
      {page === 1 && format === "all" && <InProgressSection />}

      {/* `!user` covers the still-resolving session: hold the grid's shape
          rather than flashing an empty page before the fetch can start. */}
      {!user || query.isLoading ? (
        <PackGridSkeleton label={t("loading")} />
      ) : query.isError ? (
        <Text variant="danger">{t("error")}</Text>
      ) : packs.length === 0 ? (
        <Text variant="secondary">
          {format === "all" ? t("empty") : t("emptyFiltered")}
        </Text>
      ) : (
        <section>
          {/* Names the grid so it reads as a section rather than as more of
              the "Still playing" list above it. */}
          <Text
            as="h2"
            className="mb-3 text-[17px] font-bold tracking-[-0.01em]"
          >
            {t("playedTitle")}
          </Text>
          <div className={PACK_GRID_CLASS}>
            {packs.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                playedAt={pack.lastPlayedAt}
              />
            ))}
          </div>
          <HomePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </section>
      )}
    </div>
  );
}
