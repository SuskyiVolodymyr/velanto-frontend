"use client";
import { formatDateTime } from "@/src/shared/lib/format-date";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { reportReasonLabel } from "@/src/shared/lib/report-reasons";
import { reportTargetLabel } from "@/src/shared/lib/report-display";
import { Text } from "@/src/shared/components/Text";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import type { ReportWithReporter } from "@/src/shared/types/report";

export function ReportDetailSummary({
  report,
}: {
  report: ReportWithReporter;
}) {
  const t = useTranslations("moderation");
  const target = reportTargetLabel(report);
  return (
    <>
      <div className="flex items-center justify-between">
        <Text as="h1" variant="title" className="text-2xl">
          {reportReasonLabel(report.type, report.reason)}
        </Text>
        <StatusBadge kind="report" status={report.status} />
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <Text variant="secondary">
          {t("reportedBy", {
            reporter: report.reporterUsername,
            date: formatDateTime(report.createdAt),
          })}
        </Text>
        <span className="text-xs font-semibold uppercase text-foreground-secondary">
          {report.type}
        </span>
        <Link href={target.href} className="text-acc hover:underline">
          {target.text}
        </Link>
        {report.comment && <Text variant="secondary">{report.comment}</Text>}
      </div>
    </>
  );
}
