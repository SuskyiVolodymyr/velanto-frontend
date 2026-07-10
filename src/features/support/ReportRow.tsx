import Link from "next/link";
import { reportReasonLabel } from "@/src/shared/lib/report-reasons";
import { reportTargetLabel } from "@/src/shared/lib/report-display";
import { Text } from "@/src/shared/components/Text";
import { StatusBadge } from "@/src/shared/components/StatusBadge";
import type { ReportWithReporter } from "@/src/shared/types/report";

export function ReportRow({ report }: { report: ReportWithReporter }) {
  const target = reportTargetLabel(report);
  return (
    <Link
      href={`/support/${report.id}`}
      className="grid grid-cols-[70px_1.4fr_1.1fr_1fr_100px_110px] items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 text-sm hover:bg-white/[0.03]"
    >
      <span className="text-xs font-semibold uppercase text-foreground-secondary">
        {report.type}
      </span>
      <Text className="truncate font-semibold">{target.text}</Text>
      <Text variant="secondary" className="truncate">
        {reportReasonLabel(report.type, report.reason)}
      </Text>
      <Text variant="tertiary" className="truncate">
        {report.reporterUsername}
      </Text>
      <Text variant="tertiary" className="text-xs">
        {new Date(report.createdAt).toLocaleDateString()}
      </Text>
      <StatusBadge kind="report" status={report.status} />
    </Link>
  );
}
