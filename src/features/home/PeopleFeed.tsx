"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/src/shared/components/Input";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { FollowUserRow } from "@/src/features/author/FollowUserRow";
import { HomePagination } from "@/src/features/home/HomePagination";
import { useUserSearch } from "@/src/features/home/api/user-search.queries";
import {
  MIN_SEARCH_LENGTH,
  PEOPLE_SEARCH_PAGE_SIZE,
} from "@/src/features/home/api/user-search";

// Avoids firing a search per keystroke.
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The "People" tab: find users by username and follow them. Public — a
 * signed-out visitor can search and open profiles; the follow button only shows
 * for a signed-in viewer on someone else's row (FollowUserRow handles that).
 * Below the minimum query length we show a hint rather than an empty result, so
 * a blank tab never reads as "no such people".
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

  const tooShort = query.length < MIN_SEARCH_LENGTH;
  const search = useUserSearch(query, page);
  const users = search.data?.items ?? [];
  const total = search.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PEOPLE_SEARCH_PAGE_SIZE));

  function goToPage(next: number) {
    setPage(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

      {tooShort ? (
        <Text variant="secondary">{t("hint")}</Text>
      ) : search.isError ? (
        <Text variant="danger">{t("error")}</Text>
      ) : search.isLoading ? (
        <LoadingState label={t("loading")} showLabel />
      ) : users.length === 0 ? (
        <Text variant="secondary">{t("empty")}</Text>
      ) : (
        <>
          <div className="flex w-full max-w-xl flex-col divide-y divide-border">
            {users.map((user) => (
              <FollowUserRow key={user.id} user={user} />
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
