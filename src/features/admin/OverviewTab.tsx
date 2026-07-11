"use client";

import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { useAdminOverview } from "@/src/features/admin/api/admin.queries";
import type { AdminOverview } from "@/src/shared/types/admin";

const STATS: { key: keyof AdminOverview; label: string }[] = [
  { key: "registeredUsers", label: "Registered users" },
  { key: "packs", label: "Packs" },
  { key: "plays", label: "Plays" },
  { key: "onlineUsers", label: "Online users" },
  { key: "pendingReports", label: "Pending reports" },
];

export function OverviewTab() {
  const overviewQuery = useAdminOverview();
  const overview = overviewQuery.data;

  if (overviewQuery.isLoading)
    return <Text variant="secondary">Loading overview…</Text>;
  if (overviewQuery.isError || !overview) {
    return (
      <Text className="text-[#ff6b6b]">
        Couldn&apos;t load overview. Try again later.
      </Text>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {STATS.map(({ key, label }) => {
        const value = overview[key];
        return (
          <Card key={key} className="hover:translate-y-0 hover:shadow-none">
            <Text
              variant="tertiary"
              className="text-xs uppercase tracking-wide"
            >
              {label}
            </Text>
            <Text as="p" variant="title" className="mt-2 text-2xl">
              {value === null ? "—" : value}
            </Text>
          </Card>
        );
      })}
    </div>
  );
}
