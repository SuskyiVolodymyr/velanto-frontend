"use client";

import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { useAdminOverview } from "@/src/features/admin/api/admin.queries";
import { PlaysChart } from "@/src/features/admin/PlaysChart";
import { TopPacksToday } from "@/src/features/admin/TopPacksToday";
import type { AdminOverview } from "@/src/shared/types/admin";

interface Metric {
  label: string;
  value: number | null;
  /** The small line under the value. */
  sub: string;
  /** Renders the green "live" dot the design puts on a realtime metric. */
  live?: boolean;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function buildMetrics(overview: AdminOverview): Metric[] {
  return [
    {
      label: "Registered users",
      value: overview.registeredUsers,
      sub: `+${plural(overview.newUsersThisWeek, "new")} this week`,
    },
    {
      label: "Packs",
      value: overview.packs,
      sub: `+${plural(overview.newPacksThisWeek, "new")} this week`,
    },
    {
      label: "Plays",
      value: overview.plays,
      sub: `+${plural(overview.playsThisWeek, "play")} this week`,
    },
    {
      label: "Online users",
      value: overview.onlineUsers,
      // Deliberately honest: onlineUsers is always null (no presence tracking
      // exists), so say so rather than letting the "—" look like a load failure.
      sub: "Not tracked yet",
      live: true,
    },
    {
      label: "Pending reports",
      value: overview.pendingReports,
      sub: "Awaiting review",
    },
  ];
}

export function OverviewTab() {
  const overviewQuery = useAdminOverview();
  const overview = overviewQuery.data;

  if (overviewQuery.isLoading)
    return <LoadingState label="Loading overview…" showLabel />;
  if (overviewQuery.isError || !overview) {
    return (
      <Text className="text-danger">
        Couldn&apos;t load overview. Try again later.
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
        {buildMetrics(overview).map((metric) => (
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
