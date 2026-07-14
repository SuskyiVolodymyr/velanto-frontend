"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Input } from "@/src/shared/components/Input";
import { Select } from "@/src/shared/components/Select";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { DataTable, DataTableRow } from "@/src/shared/components/DataTable";
import { TablePagination } from "@/src/shared/components/TablePagination";
import { FORMAT_LABELS } from "@/src/shared/lib/pack-display";
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
  const locale = useLocale();
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
      {/* Input and Select are w-full primitives, and `cn` is a plain joiner —
          a `flex-1`/`w-auto` passed in as className loses to their own w-full.
          So the sizing lives on wrapper divs; without them every control claims
          a full row and the bar stacks three deep. */}
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="min-w-[200px] flex-1">
          <Input
            type="search"
            aria-label="Search pack titles"
            placeholder="Search pack titles"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="w-[190px]">
          <Select
            aria-label="Filter by format"
            value={filters.format}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                format: event.target.value as PackFormat | "",
              }))
            }
            options={[
              { value: "", label: "All formats" },
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
          className="h-11 rounded-[10px] border border-border bg-white/[0.05] px-3.5 text-[13px] font-medium text-foreground-secondary transition-colors hover:bg-white/[0.08]"
        >
          Sort: {filters.sort === "oldest" ? "Oldest first" : "Newest first"}
        </button>
      </div>

      {queueQuery.isLoading && (
        <LoadingState label="Loading packs…" showLabel />
      )}
      {queueQuery.isError && (
        <Text className="text-danger">
          Couldn&apos;t load packs. Try again later.
        </Text>
      )}

      {!queueQuery.isLoading && !queueQuery.isError && (
        <>
          <DataTable
            columns={COLUMNS}
            headers={["Pack", "Author", "Format", "Submitted", ""]}
            empty="No packs waiting for review."
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
                  <DataTableRow columns={COLUMNS}>
                    <Link
                      href={`/packs/${pack.id}`}
                      className="truncate text-[13px] font-semibold text-foreground hover:text-acc"
                    >
                      {pack.title}
                    </Link>
                    <Text variant="secondary" className="truncate text-[13px]">
                      {pack.author?.username ?? "—"}
                    </Text>
                    <Text variant="tertiary" className="text-[12.5px]">
                      {FORMAT_LABELS[pack.format]}
                    </Text>
                    <Text variant="tertiary" className="text-[12.5px]">
                      {submitted ?? "—"}
                    </Text>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => approve.mutate(pack.id)}
                        className="h-[34px] rounded-lg border border-success/40 bg-success/10 px-3.5 text-[13px] font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-40"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          rejectingId === pack.id
                            ? closeRejectForm()
                            : setRejectingId(pack.id)
                        }
                        className="h-[34px] rounded-lg border border-danger/40 bg-danger/10 px-3.5 text-[13px] font-medium text-danger transition-colors hover:bg-danger/20 disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  </DataTableRow>

                  {/* Rejecting needs a reason (the API requires one), so the
                      form expands under its row rather than opening a dialog —
                      same shape as the admin Users tab's ban form. */}
                  {rejectingId === pack.id && (
                    <div className="flex items-center gap-2 border-t border-white/[0.05] bg-white/[0.02] px-[18px] py-3">
                      <div className="flex-1">
                        <Input
                          aria-label={`Rejection reason for ${pack.title}`}
                          placeholder="Why is this pack being rejected?"
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
                        className="h-10 rounded-lg border border-danger/40 bg-danger/10 px-3.5 text-[13px] font-medium text-danger transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Confirm reject
                      </button>
                      <button
                        type="button"
                        onClick={closeRejectForm}
                        className="h-10 rounded-lg border border-border bg-white/[0.05] px-3.5 text-[13px] font-medium text-foreground-secondary transition-colors hover:bg-white/[0.08]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {failed && (
                    <Text className="border-t border-white/[0.05] px-[18px] py-2 text-[12.5px] text-danger">
                      Couldn&apos;t update this pack. Try again.
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
