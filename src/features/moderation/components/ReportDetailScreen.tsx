"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Text } from "@/ui/Text";
import { Button } from "@/ui/Button";
import { PageHeader } from "@/ui/PageHeader";
import { ReportedContentPreview } from "@/features/moderation/components/ReportedContentPreview";
import { ReportDetailSummary } from "@/features/moderation/components/ReportDetailSummary";
import { ReportsAgainstTarget } from "@/features/moderation/components/ReportsAgainstTarget";
import { ReportQueueActions } from "@/features/moderation/components/ReportQueueActions";
import { ReportModerationPanel } from "@/features/moderation/components/ReportModerationPanel";
import { useReportModeration } from "@/features/moderation/hooks/use-report-moderation";
import { useReport } from "@/features/moderation/api/report-detail.queries";
import {
  useReviewReport,
  useCloseReport,
} from "@/features/moderation/api/report-detail.mutations";
import { cn } from "@/utils/cn";
import { pageContainer } from "@/constants/page-container";

export function ReportDetailScreen({ reportId }: { reportId: string }) {
  const t = useTranslations("moderation");
  const tCommon = useTranslations("common");
  const tHeader = useTranslations("header");
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
    ? t("reviewError")
    : closeMutation.isError
      ? t("closeError")
      : "";

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <>
        <PageHeader back={{ href: "/moderation", label: t("queueBack") }} />
        <div className="mx-auto max-w-md py-16 text-center">
          <Text variant="secondary">{tCommon("loginRequired")}</Text>
          <Button
            className="mt-4"
            onClick={() =>
              router.push(`/auth?next=${encodeURIComponent(pathname)}`)
            }
          >
            {tHeader("logIn")}
          </Button>
        </div>
      </>
    );
  }

  if (!allowed) return null;

  if (reportQuery.isLoading) return null;

  if (reportQuery.isError || !report) {
    return (
      <>
        <PageHeader back={{ href: "/moderation", label: t("queueBack") }} />
        <div className="mx-auto max-w-md py-16 text-center">
          <Text variant="danger">{t("reportNotFound")}</Text>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={{ href: "/moderation", label: t("queueBack") }}
        crumb={t("reportCrumb")}
        meta={
          <span data-mono="1" className="text-xs text-foreground-tertiary/60">
            {reportId.slice(0, 8)}
          </span>
        }
      />
      <main
        className={cn(pageContainer(720), "flex flex-1 flex-col gap-6 py-10")}
      >
        <ReportDetailSummary report={report} />

        {/* The reported content itself (T7/D8): additive, not blocking — its
          own fetch/loading/error state is scoped inside this component, so
          it never delays or hides the actions below. `viewerRole` lets it
          gate the user-report summary to manager/admin, matching the
          backend's actual `adminClient.userDetail` RBAC (moderator+ can
          reach this screen, but only manager/admin can hit that endpoint). */}
        <ReportedContentPreview report={report} viewerRole={user?.role} />

        {/* The target's report history, above the actions: whether this is a
            one-off or a pattern is the main thing that changes the decision
            the buttons below are about. */}
        <ReportsAgainstTarget report={report} />

        <ReportQueueActions
          status={report.status}
          actionBusy={actionBusy}
          actionError={actionError}
          onReview={() => reviewMutation.mutate()}
          onClose={() => closeMutation.mutate()}
        />

        <ReportModerationPanel report={report} moderation={moderation} />
      </main>
    </>
  );
}
