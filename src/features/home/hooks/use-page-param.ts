"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * The page the URL is asking for, or 1 for anything that isn't a page number.
 * `?page=` is reader-editable and survives being pasted around, so a missing,
 * negative, fractional or non-numeric value has to mean page 1 rather than
 * reaching the API — the backend rejects a non-positive page outright.
 */
export function pageFromParam(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

/**
 * Keeps a paginated feed's current page in the query string instead of in
 * component state.
 *
 * As state it lived only as long as the component: opening a pack from page 3
 * and pressing Back landed you on page 1 with the list re-fetched from the top,
 * a reload did the same, and the URL couldn't be shared or bookmarked at a
 * given page (velanto-frontend#443, #450).
 *
 * `replace`, not `push`: paging isn't a navigation step worth its own history
 * entry — the docs reader makes the same call for `?topic=`. Back still returns
 * you to the page you left from, because that IS the URL you left.
 *
 * Other query parameters are preserved, which matters on the dashboard where
 * `?q=` is already in the URL. Page 1 writes no parameter at all — a bare `/`
 * says the same thing and keeps a shared link tidy.
 */
export function usePageParam(): {
  page: number;
  setPage: (next: number) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = pageFromParam(searchParams.get("page"));

  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next <= 1) params.delete("page");
      else params.set("page", String(next));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams],
  );

  return { page, setPage };
}
