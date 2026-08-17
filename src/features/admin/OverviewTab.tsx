"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/ui/Text";
import { LoadingState } from "@/ui/LoadingState";
import { useAdminOverview } from "@/features/admin/api/admin.queries";
import { PlaysChart } from "@/features/admin/PlaysChart";
import { ActivityChart } from "@/features/admin/ActivityChart";
import { TopPacksToday } from "@/features/admin/TopPacksToday";
import type { AdminOverview } from "@/types/admin";
import { formatBytes } from "@/utils/format-bytes";

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
      // "Unique players", never "online": shared addresses collapse into one
      // and one person on two devices counts as two, so the label must not
      // promise a headcount the number cannot deliver.
      label: t("metricUniquePlayers"),
      value: overview.livePlayers.unique,
      // The breakdown, not the window length. The three parts are disjoint and
      // sum to the headline, which is the reassurance a reader needs; the
      // window is the backend's constant and restating it here would be a
      // number that silently goes stale the moment that constant moves.
      sub: t("livePlayersBreakdown", {
        registered: overview.livePlayers.registered,
        guests: overview.livePlayers.guests,
        anonymous: overview.livePlayers.anonymous,
      }),
      live: true,
    },
    {
      label: t("metricPendingReports"),
      value: overview.pendingReports,
      sub: t("awaitingReview"),
    },
    {
      label: t("metricPendingPacks"),
      value: overview.pendingPacks,
      sub: t("awaitingModeration"),
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
      {/* Fixed column counts rather than auto-fit: with seven cards, auto-fit
          packed them into one long row on a wide screen and the numbers got
          lost in it. Two rows of four (the last row short) keeps each card
          wide enough to read and gives the section a shape. */}
      <section className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
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

      <ActivityChart />
    </div>
  );
}
