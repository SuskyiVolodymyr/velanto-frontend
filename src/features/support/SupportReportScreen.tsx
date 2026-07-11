"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { ReportDetailSummary } from "@/src/features/support/ReportDetailSummary";
import { ReportQueueActions } from "@/src/features/support/ReportQueueActions";
import { ReportModerationPanel } from "@/src/features/support/ReportModerationPanel";
import { useReportModeration } from "@/src/features/support/use-report-moderation";
import { useReport } from "@/src/features/support/api/report-detail.queries";
import {
  useReviewReport,
  useCloseReport,
} from "@/src/features/support/api/report-detail.mutations";

export function SupportReportScreen({ reportId }: { reportId: string }) {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Computed here (ahead of the `authStatus`/`status` early returns below)
  // rather than alongside the JSX, per Rules of Hooks.
  const allowed =
    user?.role === "moderator" ||
    user?.role === "manager" ||
    user?.role === "admin";

  useEffect(() => {
    if (authStatus === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [authStatus, allowed, router]);

  const reportQuery = useReport(reportId, { enabled: allowed });
  const report = reportQuery.data;

  const moderation = useReportModeration(report ?? null);

  const reviewMutation = useReviewReport(reportId);
  const closeMutation = useCloseReport(reportId);
  const actionBusy = reviewMutation.isPending || closeMutation.isPending;
  const actionError = reviewMutation.isError
    ? "Couldn't mark this report as reviewing. Try again."
    : closeMutation.isError
      ? "Couldn't close this report. Try again."
      : "";

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">
          You need to be logged in to view this page.
        </Text>
        <Button
          className="mt-4"
          onClick={() =>
            router.push(`/auth?next=${encodeURIComponent(pathname)}`)
          }
        >
          Log in
        </Button>
      </div>
    );
  }

  if (!allowed) return null;

  if (reportQuery.isLoading) return null;

  if (reportQuery.isError || !report) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text className="text-[#ff6b6b]">This report doesn&apos;t exist.</Text>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-7 py-10">
      <ReportDetailSummary report={report} />

      <ReportQueueActions
        status={report.status}
        actionBusy={actionBusy}
        actionError={actionError}
        onReview={() => reviewMutation.mutate()}
        onClose={() => closeMutation.mutate()}
      />

      <ReportModerationPanel report={report} moderation={moderation} />
    </main>
  );
}
