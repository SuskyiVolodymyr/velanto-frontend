"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { SearchField } from "@/src/shared/components/SearchField";
import { Dropdown } from "@/src/shared/components/Dropdown";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { DataTable, DataTableRow } from "@/src/shared/components/DataTable";
import { TablePagination } from "@/src/shared/components/TablePagination";
import { FORMAT_LABELS, formatLabel } from "@/src/shared/lib/pack-display";
import { formatRelativeTimeIntl } from "@/src/shared/lib/relative-time";
import { PACK_FORMATS } from "@/src/shared/types/pack";
import {
  usePackQueue,
  useApprovePack,
  useRejectPack,
} from "@/src/features/moderation/api/moderation.queries";
import {
  EMPTY_PACK_QUEUE_FILTERS,
  MODERATION_PAGE_SIZE,
  type PackQueueFilters,
} from "@/src/features/moderation/api/moderation";
import type { PackFormat } from "@/src/shared/types/pack";

const FILTER_DEBOUNCE_MS = 300;
const COLUMNS = "1.5fr 1fr 120px 130px 200px";

export function PackApprovalsTab() {
  const t = useTranslations("moderation");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<PackQueueFilters>(
    EMPTY_PACK_QUEUE_FILTERS,
  );
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Only the free-text box is debounced. Returning `prev` unchanged when the
  // term is identical is load-bearing: `filters` identity is what the
  // reset-to-page-1 effect watches, so minting a new object every debounce tick
  // would knock the moderator back to page 1 shortly after they paged forward.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const q = searchInput.trim();
      setFilters((prev) => (prev.q === q ? prev : { ...prev, q }));
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPage(1);
  }, [filters]);

  const queueQuery = usePackQueue(filters, page, { enabled: true });
  const approve = useApprovePack();
  const reject = useRejectPack();

  const packs = queueQuery.data?.items ?? [];
  const total = queueQuery.data?.total ?? 0;

  function closeRejectForm() {
    setRejectingId(null);
    setRejectReason("");
  }

  function submitReject(id: string) {
    reject.mutate(
      { id, reason: rejectReason.trim() },
      { onSuccess: closeRejectForm },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* SearchField and Dropdown are w-full primitives, and `cn` is a plain
          joiner — a `flex-1`/`w-auto` passed in as className loses to their own
          w-full. So the sizing lives on wrapper divs; without them every
          control claims a full row and the bar stacks three deep. All three
          controls are 44px per the mock, which is what `size="lg"` selects. */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-[200px] flex-1">
          <SearchField
            size="lg"
            surface="card"
            aria-label={t("searchPacks")}
            placeholder={t("searchPacks")}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="w-[190px]">
          {/* The design's listbox, not a native <select>: the OS menu a
              <select> opens ignores every token on this page. */}
          <Dropdown
            size="lg"
            surface="card"
            ariaLabel={t("filterFormat")}
            value={filters.format}
            onChange={(format) =>
              setFilters((prev) => ({
                ...prev,
                format: format as PackFormat | "",
              }))
            }
            options={[
              { value: "", label: t("allFormats") },
              // Every format is a filterable option, each with a FORMAT_LABELS
              // entry; derived from PACK_FORMATS so it can't drift.
              ...PACK_FORMATS.map((format) => ({
                value: format,
                label: FORMAT_LABELS[format],
              })),
            ]}
          />
        </div>
        {/* Oldest-first is the default because the queue is a backlog: newest
            first would let fresh submissions jump the line forever. */}
        <button
          type="button"
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              sort: prev.sort === "oldest" ? "newest" : "oldest",
            }))
          }
          className="h-11 rounded-control border border-border bg-white/[0.05] px-[14px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:bg-white/[0.09] hover:text-foreground"
        >
          {t("sortLabel")}{" "}
          {filters.sort === "oldest" ? t("sortOldest") : t("sortNewest")}
        </button>
      </div>

      {queueQuery.isLoading && (
        <LoadingState label={t("loadingPacks")} showLabel />
      )}
      {queueQuery.isError && <Text variant="danger">{t("packsError")}</Text>}

      {!queueQuery.isLoading && !queueQuery.isError && (
        <>
          <DataTable
            columns={COLUMNS}
            headers={[
              t("hPack"),
              t("hAuthor"),
              t("hFormat"),
              t("hSubmitted"),
              "",
            ]}
            empty={
              // The mock gives the pack queue a richer empty state than the
              // report queue's single line: an "all clear" tick above it, since
              // here an empty queue is good news rather than a dead end.
              <span className="flex flex-col items-center gap-2.5">
                <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-success/10 text-success">
                  <Check size={21} strokeWidth={2.2} aria-hidden />
                </span>
                {t("noPacks")}
              </span>
            }
            isEmpty={packs.length === 0}
          >
            {packs.map((pack) => {
              const busy =
                (approve.isPending && approve.variables === pack.id) ||
                (reject.isPending && reject.variables?.id === pack.id);
              const failed =
                (approve.isError && approve.variables === pack.id) ||
                (reject.isError && reject.variables?.id === pack.id);
              const submitted = formatRelativeTimeIntl(
                pack.submittedAt ?? pack.createdAt,
                locale,
              );
              return (
                // A Fragment, not a div: role="table" must own its role="row"
                // children directly, and a wrapper element between them orphans
                // every data row from the table for a screen reader.
                <Fragment key={pack.id}>
                  <DataTableRow
                    columns={COLUMNS}
                    onClick={() => router.push(`/moderation/packs/${pack.id}`)}
                  >
                    <Link
                      href={`/moderation/packs/${pack.id}`}
                      // The row itself already navigates here on click (see
                      // DataTableRow's `onClick` above); without this the
                      // click would bubble up and fire router.push a second
                      // time on top of the Link's own navigation.
                      onClick={(event) => event.stopPropagation()}
                      className="block truncate text-[13px] font-semibold text-foreground hover:text-acc"
                    >
                      {pack.title}
                    </Link>
                    <Text variant="secondary" className="truncate text-[13px]">
                      {pack.author?.username ?? "—"}
                    </Text>
                    <Text variant="tertiary" className="text-[12.5px]">
                      {formatLabel(pack.format)}
                    </Text>
                    <Text variant="tertiary" className="text-[12.5px]">
                      {submitted ?? "—"}
                    </Text>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(event) => {
                          // The row itself navigates to the review screen on
                          // click (see DataTableRow's `onClick`) — this button
                          // is a descendant of that row, so its click would
                          // bubble up and fire the row's navigation too unless
                          // stopped here. The reject toggle button just below
                          // needs the same guard; the expanded reject-reason
                          // form (rendered as a sibling of the row, not a
                          // descendant) does not.
                          event.stopPropagation();
                          approve.mutate(pack.id);
                        }}
                        className="h-[34px] rounded-[9px] border border-success/40 bg-success/10 px-[14px] text-[13px] font-semibold text-success transition-colors hover:bg-success/20 disabled:opacity-40"
                      >
                        {t("approve")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (rejectingId === pack.id) closeRejectForm();
                          else setRejectingId(pack.id);
                        }}
                        className="h-[34px] rounded-[9px] border border-danger/40 bg-danger/10 px-[14px] text-[13px] font-semibold text-danger transition-colors hover:bg-danger/20 disabled:opacity-40"
                      >
                        {t("reject")}
                      </button>
                    </div>
                  </DataTableRow>

                  {/* Rejecting needs a reason (the API requires one), so the
                      form expands under its row rather than opening a dialog —
                      same shape as the admin Users tab's ban form. */}
                  {rejectingId === pack.id && (
                    <div className="flex flex-wrap items-center gap-[9px] border-t border-white/[0.05] bg-white/[0.02] px-[18px] py-[13px]">
                      <div className="min-w-[200px] flex-1">
                        <Input
                          aria-label={t("rejectReasonAria", {
                            title: pack.title,
                          })}
                          placeholder={t("rejectPlaceholder")}
                          value={rejectReason}
                          onChange={(event) =>
                            setRejectReason(event.target.value)
                          }
                        />
                      </div>
                      <button
                        type="button"
                        disabled={busy || rejectReason.trim().length === 0}
                        onClick={() => submitReject(pack.id)}
                        className="h-10 rounded-[10px] border border-danger/40 bg-danger/10 px-[14px] text-[13px] font-[650] text-danger transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {t("confirmReject")}
                      </button>
                      <button
                        type="button"
                        onClick={closeRejectForm}
                        className="h-10 rounded-[10px] border border-border bg-white/[0.05] px-[14px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:bg-white/[0.09] hover:text-foreground"
                      >
                        {tCommon("cancel")}
                      </button>
                    </div>
                  )}

                  {failed && (
                    <Text
                      variant="danger"
                      className="border-t border-white/[0.05] px-[18px] py-2 text-[12.5px]"
                    >
                      {t("updatePackError")}
                    </Text>
                  )}
                </Fragment>
              );
            })}
          </DataTable>

          <TablePagination
            page={page}
            total={total}
            pageSize={MODERATION_PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
