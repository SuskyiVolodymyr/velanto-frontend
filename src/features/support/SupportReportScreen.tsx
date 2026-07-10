"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useClientData } from "@/src/shared/hooks/useClientData";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { ReportDetailSummary } from "@/src/features/support/ReportDetailSummary";
import { ReportQueueActions } from "@/src/features/support/ReportQueueActions";
import { ReportModerationPanel } from "@/src/features/support/ReportModerationPanel";
import { useReportModeration } from "@/src/features/support/use-report-moderation";

export function SupportReportScreen({ reportId }: { reportId: string }) {
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // Computed here (ahead of the `authStatus`/`status` early returns below)
  // rather than alongside the JSX, per Rules of Hooks: the report-fetch
  // effect below reads `allowed`, and hooks can't follow a conditional
  // return — same discipline AuthorScreen.tsx had to apply.
  const allowed = user?.role === "moderator" || user?.role === "manager" || user?.role === "admin";

  useEffect(() => {
    if (authStatus === "authenticated" && !allowed) {
      router.replace("/");
    }
  }, [authStatus, allowed, router]);

  // reportId can change without a remount (e.g. clicking a different report
  // link while already on a report detail page); useClientData handles the
  // reset-to-loading + abort of the previous fetch on that change.
  const reportQuery = useClientData(() => reportsClient.getById(reportId), [reportId], {
    enabled: allowed,
  });
  const report = reportQuery.data;

  const moderation = useReportModeration(report);

  async function handleReview() {
    setActionBusy(true);
    setActionError("");
    try {
      const updated = await reportsClient.review(reportId);
      reportQuery.setData((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      setActionError("Couldn't mark this report as reviewing. Try again.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleClose() {
    setActionBusy(true);
    setActionError("");
    try {
      const updated = await reportsClient.close(reportId);
      reportQuery.setData((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      setActionError("Couldn't close this report. Try again.");
    } finally {
      setActionBusy(false);
    }
  }

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">You need to be logged in to view this page.</Text>
        <Button className="mt-4" onClick={() => router.push(`/auth?next=${encodeURIComponent(pathname)}`)}>
          Log in
        </Button>
      </div>
    );
  }

  if (!allowed) return null;

  if (reportQuery.loading) return null;

  if (reportQuery.error || !report) {
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
        onReview={() => void handleReview()}
        onClose={() => void handleClose()}
      />

      <ReportModerationPanel report={report} moderation={moderation} />
    </main>
  );
}
