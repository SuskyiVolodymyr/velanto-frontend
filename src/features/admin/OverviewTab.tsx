"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { useAdminOverview } from "@/src/features/admin/api/admin.queries";
import { PlaysChart } from "@/src/features/admin/PlaysChart";
import { TopPacksToday } from "@/src/features/admin/TopPacksToday";
import type { AdminOverview } from "@/src/shared/types/admin";
import { formatBytes } from "@/src/shared/lib/format-bytes";

interface Metric {
  label: string;
  /**
   * A count, a preformatted string (storage reads as "1.4 GB"), or null for a
   * metric with no figure yet — rendered as an em dash.
   */
  value: number | string | null;
  /** The small line under the value. */
  sub: string;
  /** Renders the green "live" dot the design puts on a realtime metric. */
  live?: boolean;
}

type AdminTranslator = ReturnType<typeof useTranslations<"admin">>;

function buildMetrics(overview: AdminOverview, t: AdminTranslator): Metric[] {
  return [
    {
      label: t("metricRegisteredUsers"),
      value: overview.registeredUsers,
      sub: t("newThisWeek", { count: overview.newUsersThisWeek }),
    },
    {
      label: t("metricPacks"),
      value: overview.packs,
      sub: t("newThisWeek", { count: overview.newPacksThisWeek }),
    },
    {
      label: t("metricPlays"),
      value: overview.plays,
      sub: t("playsThisWeek", { count: overview.playsThisWeek }),
    },
    {
      label: t("metricOnlineUsers"),
      value: overview.onlineUsers,
      // The sub-line names WHO is counted, not how many minutes: the window is
      // the backend's constant, and restating it here would be a number that
      // silently goes stale the moment that constant moves.
      sub: t("activeRecently"),
      live: true,
    },
    {
      label: t("metricPendingReports"),
      value: overview.pendingReports,
      sub: t("awaitingReview"),
    },
    {
      label: t("metricStorage"),
      // What every user is holding right now, summed — the same number uploads
      // are enforced against, so this card can never disagree with the wall a
      // user hits. There is no all-time figure and cannot be one from this
      // data: media rows are hard-deleted with their object.
      value: formatBytes(overview.storage.usedBytes),
      sub: t("storageOfCeiling", {
        total: formatBytes(overview.storage.ceilingBytes),
      }),
    },
  ];
}

export function OverviewTab() {
  const t = useTranslations("admin");
  const overviewQuery = useAdminOverview();
  const overview = overviewQuery.data;

  if (overviewQuery.isLoading)
    return <LoadingState label={t("loadingOverview")} showLabel />;
  if (overviewQuery.isError || !overview) {
    return <Text variant="danger">{t("overviewError")}</Text>;
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
        {buildMetrics(overview, t).map((metric) => (
          <div
            key={metric.label}
            className="rounded-[14px] border border-border bg-white/[0.02] px-5 py-[18px]"
          >
            <div className="mb-2 flex items-center gap-[7px]">
              {metric.live && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              )}
              <Text
                variant="tertiary"
                className="text-[11px] uppercase tracking-[0.07em]"
              >
                {metric.label}
              </Text>
            </div>
            <Text as="p" variant="title" className="text-[26px] tabular-nums">
              {metric.value === null ? "—" : metric.value}
            </Text>
            <Text variant="tertiary" className="mt-1 text-xs">
              {metric.sub}
            </Text>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <PlaysChart buckets={overview.playsLast7Days} />
        <TopPacksToday packs={overview.topPacksToday} />
      </section>
    </div>
  );
}
