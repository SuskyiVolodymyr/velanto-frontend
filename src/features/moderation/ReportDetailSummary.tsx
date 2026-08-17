"use client";
import { formatDateTime } from "@/shared/utils/format-date";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { reportReasonLabel } from "@/shared/constants/report-reasons";
import { reportTargetLabel } from "@/shared/utils/report-display";
import { Text } from "@/shared/ui/Text";
import { StatusBadge } from "@/shared/components/StatusBadge";
import type { ReportWithReporter } from "@/shared/types/report";

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
