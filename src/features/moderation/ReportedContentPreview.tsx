"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { packsClient } from "@/src/shared/lib/packs-client";
import { adminClient } from "@/src/shared/lib/admin-client";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { PackContentsPreview } from "@/src/features/moderation/PackContentsPreview";
import { ReportedUserSummary } from "@/src/features/moderation/ReportedUserSummary";
import type { Report } from "@/src/shared/types/report";

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

/**
 * The reported content itself, inline on the report detail screen (T7/D8):
 * a pack/round report's full pool/item contents (via the shared
 * `PackContentsPreview`, D6/D10), or a compact reported-account summary
 * (D9 — aggregate counts only, no itemized past-reports list).
 *
 * Additive, not blocking: owns its own fetch and loading/error state,
 * scoped to just this section, so a slow/failed content fetch never blocks
 * `ReportDetailScreen`'s summary/actions from rendering. `ReportDetailScreen`
 * only mounts this once the report itself has loaded and the viewer passed
 * the role gate, so no separate "allowed"/"enabled" prop is needed here —
 * both queries below key off the report's own `type`, not viewer access.
 */
export function ReportedContentPreview({ report }: { report: Report }) {
  const t = useTranslations("moderation");
  const targetId = report.targetId;
  const isPackTarget = report.type === "pack" || report.type === "round";
  const isUserTarget = report.type === "user";

  const targetPackQuery = useQuery({
    queryKey: reportTargetPackQueryKey(targetId),
    queryFn: () => packsClient.getById(targetId),
    enabled: isPackTarget,
  });

  const targetUserQuery = useQuery({
    queryKey: reportTargetUserQueryKey(targetId),
    queryFn: () => adminClient.userDetail(targetId),
    enabled: isUserTarget,
  });

  if (isPackTarget) {
    return (
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
    );
  }

  if (isUserTarget) {
    return (
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
    );
  }

  return null;
}
