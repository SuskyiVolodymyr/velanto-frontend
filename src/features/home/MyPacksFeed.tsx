"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
 * The page the URL is asking for, or 1 for anything that isn't a page number.
 * `?page=` is reader-editable and survives being pasted around, so a missing,
 * negative, fractional or non-numeric value has to mean page 1 rather than
 * reaching the API — the backend rejects a non-positive page outright.
 */
function pageFromParam(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

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

  // The page lives in the URL, not in component state. It was state, so
  // opening a pack from page 3 and pressing Back landed you on page 1 — the
  // component remounted with its initial value and the list re-fetched from
  // the top. In the URL it survives Back, a reload and a copied link alike.
  //
  // `replace`, not `push`: paging isn't a navigation step worth its own
  // history entry (same call the docs reader makes for `?topic=`). Back still
  // returns you to the page you left from, because that IS the URL you left.
  //
  // The status and sort chips are deliberately still state. Putting them in
  // the URL too is a reasonable follow-up, but it is a separate decision about
  // what a shared /my-packs link should mean, and this page is noindex and
  // per-user anyway.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = pageFromParam(searchParams.get("page"));

  function setPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    // Page 1 is the default, so it says nothing — a bare /my-packs is tidier
    // than /my-packs?page=1 and means exactly the same thing.
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  const filters = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      sort: dateOrder,
      // Page 1 is the API default; sending it explicitly would only split the
      // cache between two keys that mean the same request.
      page: page > 1 ? page : undefined,
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
