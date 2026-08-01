"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/src/shared/components/Text";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { formatDate } from "@/src/shared/lib/format-date";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { reportReasonLabel } from "@/src/shared/lib/report-reasons";
import type { ReportWithReporter } from "@/src/shared/types/report";

/**
 * How much history to pull. A moderator deciding on one report needs the shape
 * of the target's record, not an archive — anything past this is a signal in
 * itself, and the count line says so rather than silently truncating.
 */
const HISTORY_LIMIT = 10;

/**
 * Every other report filed against the same target, on the report detail
 * screen: is this a one-off, or the fifth complaint this week?
 *
 * Spans report types on purpose — a pack's id matches both its `pack` reports
 * and the `round` reports filed against its rounds, and a moderator judging the
 * pack wants both. The report being viewed is filtered out client-side (the
 * endpoint has no "exclude" parameter); `total` still counts it, so the count
 * line subtracts one rather than reporting a number the list contradicts.
 *
 * Reachable by `moderator` and up — unlike `ReportedUserSummary`, which needs
 * `GET /admin/users/:id` (manager/admin only). This is deliberately the surface
 * a plain moderator gets.
 */
export function ReportsAgainstTarget({
  report,
}: {
  report: ReportWithReporter;
}) {
  const t = useTranslations("moderation");

  const query = useQuery({
    queryKey: ["reports-against", report.targetId] as const,
    queryFn: () =>
      reportsClient.list({ targetId: report.targetId, limit: HISTORY_LIMIT }),
  });

  const others = (query.data?.items ?? []).filter(
    (row) => row.id !== report.id,
  );
  const otherTotal = Math.max((query.data?.total ?? 0) - 1, 0);

  return (
    <section className="flex flex-col gap-3.5">
      <Text
        as="h2"
        variant="tertiary"
        className="text-[12px] font-bold uppercase tracking-[0.14em]"
      >
        {t("otherReportsHeading")}
      </Text>

      {query.isLoading ? (
        <LoadingState label={t("otherReportsLoading")} showLabel />
      ) : query.isError ? (
        <Text variant="danger">{t("otherReportsError")}</Text>
      ) : others.length === 0 ? (
        <Text variant="tertiary" className="text-sm">
          {t("otherReportsNone")}
        </Text>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {others.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] border border-border bg-white/[0.02] px-3.5 py-2.5"
              >
                <Link
                  href={`/moderation/reports/${row.id}`}
                  className="text-[13px] font-semibold text-foreground hover:text-acc"
                >
                  {reportReasonLabel(row.type, row.reason)}
                </Link>
                <Text variant="tertiary" className="text-[12.5px]">
                  {t("otherReportsBy", { reporter: row.reporterUsername })}
                </Text>
                <Text variant="tertiary" className="text-[12.5px]">
                  {formatDate(row.createdAt)}
                </Text>
                <span className="ms-auto">
                  <StatusBadge kind="report" status={row.status} />
                </span>
              </li>
            ))}
          </ul>
          {otherTotal > others.length && (
            <Text variant="tertiary" className="text-xs">
              {t("otherReportsMore", {
                shown: others.length,
                total: otherTotal,
              })}
            </Text>
          )}
        </>
      )}
    </section>
  );
}
