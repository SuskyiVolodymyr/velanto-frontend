"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/src/shared/components/Input";
import { Text } from "@/src/shared/components/Text";
import { Skeleton } from "@/src/shared/components/Skeleton";
import { PersonCard } from "@/src/features/home/PersonCard";
import { HomePagination } from "@/src/features/home/HomePagination";
import { useUserSearch } from "@/src/features/home/api/user-search.queries";
import { PEOPLE_SEARCH_PAGE_SIZE } from "@/src/features/home/api/user-search";

// Avoids firing a search per keystroke.
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The `/people` route body: a browsable directory of everyone, with a search
 * box over it. Public — a signed-out visitor can browse and open profiles; the
 * follow button only shows for a signed-in viewer on someone else's row
 * (FollowUserRow handles that).
 *
 * It used to render a "type at least 2 characters" hint until you typed, so
 * the page opened on nothing at all. The backend now serves the whole
 * directory alphabetically for an empty query, so the page opens on page 1 of
 * everyone and typing narrows it.
 */
export function PeopleFeed() {
  const t = useTranslations("people");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(input.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [input]);

  // A new query is a fresh result set — restart at page 1.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPage(1);
  }, [query]);

  const search = useUserSearch(query, page);
  const users = search.data?.items ?? [];
  const total = search.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PEOPLE_SEARCH_PAGE_SIZE));

  // No scroll-to-top on page change: the pagination control sits at the foot
  // of the grid, so jumping to the top pulls the next page's first row out of
  // view and puts the control you just used off-screen.
  function goToPage(next: number) {
    setPage(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <Input
        type="search"
        aria-label={t("searchLabel")}
        placeholder={t("searchPlaceholder")}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        className="max-w-md"
      />

      {search.isError ? (
        <Text variant="danger">{t("error")}</Text>
      ) : search.isLoading ? (
        <PeopleGridSkeleton />
      ) : users.length === 0 ? (
        <Text variant="secondary">{t("empty")}</Text>
      ) : (
        <>
          <div className={GRID_CLASS}>
            {users.map((user) => (
              <PersonCard key={user.id} user={user} />
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

/**
 * Fixed column counts, not the pack grid's `auto-fill` tracks. Every count here
 * divides {@link PEOPLE_SEARCH_PAGE_SIZE} (20), so a full page is always whole
 * rows — 5x4, 4x5, 2x10, 1x20. `auto-fill` picked 6 across at desktop width,
 * which left the last row holding 2 of 6 and read as a broken grid rather than
 * a page boundary. Change the page size and these have to change with it.
 */
const GRID_CLASS =
  "grid grid-cols-1 gap-[18px] min-[520px]:grid-cols-2 min-[900px]:grid-cols-4 min-[1180px]:grid-cols-5";

/**
 * A full page of card-shaped placeholders while the directory loads, in place
 * of a centred spinner: the grid is the page's whole content, so holding its
 * shape keeps the layout from jumping when the real cards land.
 *
 * Mirrors PersonCard's own proportions — the 16:10 head, then the handle line.
 * A card there has no follow button when signed out, so the skeleton omits it
 * too rather than promising a control that may not appear.
 */
function PeopleGridSkeleton() {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: PEOPLE_SEARCH_PAGE_SIZE }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[18px] border border-border bg-surface-card"
        >
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="p-[14px]">
            <Skeleton className="h-[18px] w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
