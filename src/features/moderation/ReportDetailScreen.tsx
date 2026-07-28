"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { PackContentsPreview } from "@/src/features/moderation/PackContentsPreview";
import { ReportedUserSummary } from "@/src/features/moderation/ReportedUserSummary";
import { ReportDetailSummary } from "@/src/features/moderation/ReportDetailSummary";
import { ReportQueueActions } from "@/src/features/moderation/ReportQueueActions";
import { ReportModerationPanel } from "@/src/features/moderation/ReportModerationPanel";
import { useReportModeration } from "@/src/features/moderation/use-report-moderation";
import { useReport } from "@/src/features/moderation/api/report-detail.queries";
import {
  useReviewReport,
  useCloseReport,
} from "@/src/features/moderation/api/report-detail.mutations";

/**
 * Query key for the target pack fetched to render a `pack`/`round` report's
 * inline content preview (T7/D8). A round report's `targetId` IS the pack id
 * — a round has no resource of its own, so `PackContentsPreview` narrows to
 * `report.roundIndex` client-side once the pack loads. Own key, distinct from
 * `PackReviewScreen`'s "pack-review" key — a moderator viewing a REPORTED
 * pack here is a different concern from reviewing a pending one there, even
 * though both ultimately call `packsClient.getById`.
 */
function reportTargetPackQueryKey(targetId: string) {
  return ["report-target-pack", targetId] as const;
}

/**
 * Query key for the target account fetched to render a `user` report's
 * inline summary (T7/D8) — the same aggregate `AdminUserDetailScreen`
 * already fetches via `adminClient.userDetail`.
 */
function reportTargetUserQueryKey(targetId: string) {
  return ["report-target-user", targetId] as const;
}

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

  // The reported content preview (T7/D8): additive, not blocking — its own
  // loading/error state is scoped to just the section below, never the whole
  // screen (see the render branches further down). `targetId` falls back to
  // "" before the report loads; both queries stay `enabled: false` until
  // then, so the placeholder key/queryFn never actually fires.
  const targetId = report?.targetId ?? "";
  const isPackTarget = report?.type === "pack" || report?.type === "round";
  const isUserTarget = report?.type === "user";

  const targetPackQuery = useQuery({
    queryKey: reportTargetPackQueryKey(targetId),
    queryFn: () => packsClient.getById(targetId),
    enabled: allowed && isPackTarget,
  });

  const targetUserQuery = useQuery({
    queryKey: reportTargetUserQueryKey(targetId),
    queryFn: () => adminClient.userDetail(targetId),
    enabled: allowed && isUserTarget,
  });

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
    );
  }

  if (!allowed) return null;

  if (reportQuery.isLoading) return null;

  if (reportQuery.isError || !report) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="danger">{t("reportNotFound")}</Text>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-7 py-10">
      <ReportDetailSummary report={report} />

      {isPackTarget && (
        <section className="flex flex-col gap-3.5">
          <Text
            as="h2"
            variant="tertiary"
            className="text-[12px] font-bold uppercase tracking-[0.14em]"
          >
            {t("contentsHeading")}
          </Text>
          {targetPackQuery.isLoading ? (
            <LoadingState label={t("loadingReportedContent")} showLabel />
          ) : targetPackQuery.isError || !targetPackQuery.data ? (
            <Text variant="danger">{t("reportedContentError")}</Text>
          ) : (
            <PackContentsPreview
              pack={targetPackQuery.data}
              roundIndex={
                report.type === "round"
                  ? (report.roundIndex ?? undefined)
                  : undefined
              }
            />
          )}
        </section>
      )}

      {isUserTarget && (
        <section className="flex flex-col gap-3.5">
          <Text
            as="h2"
            variant="tertiary"
            className="text-[12px] font-bold uppercase tracking-[0.14em]"
          >
            {t("reportedUserHeading")}
          </Text>
          {targetUserQuery.isLoading ? (
            <LoadingState label={t("loadingReportedContent")} showLabel />
          ) : targetUserQuery.isError || !targetUserQuery.data ? (
            <Text variant="danger">{t("reportedContentError")}</Text>
          ) : (
            <ReportedUserSummary user={targetUserQuery.data} />
          )}
        </section>
      )}

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
