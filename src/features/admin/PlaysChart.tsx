"use client";

import { Text } from "@/src/shared/components/Text";
import type { PlaysDayBucket } from "@/src/shared/types/admin";

/** Weekday initial(s) for a YYYY-MM-DD day, e.g. "Mon". */
function dayLabel(date: string): string {
  // Parsed as UTC (the backend emits a plain calendar day); read back in UTC too
  // so the label can't slide to the previous day west of Greenwich.
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/**
 * The "plays — last 7 days" bar chart. The backend always sends 7 zero-filled
 * buckets, so the chart renders a full, evenly spaced week even on a quiet one.
 */
export function PlaysChart({ buckets }: { buckets: PlaysDayBucket[] }) {
  // Scale to the busiest day. `|| 1` guards an all-zero week — without it every
  // bar would divide by zero; with it they all render at the 2px floor instead.
  const peak = Math.max(...buckets.map((b) => b.plays), 0) || 1;

  return (
    <div className="rounded-[16px] border border-border bg-white/[0.02] px-[22px] py-5">
      <Text
        variant="tertiary"
        className="mb-[18px] text-xs font-semibold uppercase tracking-[0.1em]"
      >
        Plays — last 7 days
      </Text>
      <div className="flex h-[120px] items-end gap-2.5">
        {buckets.map((bucket) => (
          <div
            key={bucket.date}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <div
              className="w-full max-w-[34px] rounded-t-md bg-gradient-to-b from-acc to-acc/40"
              // Percentage of the tallest bar, with a 2px floor so a zero day is
              // still a visible baseline tick rather than nothing at all.
              style={{
                height: `${Math.max((bucket.plays / peak) * 100, 2)}%`,
              }}
              // The bar itself is decorative; the number lives in the label.
              aria-hidden
            />
            <Text variant="tertiary" className="text-[10.5px]">
              {dayLabel(bucket.date)}
            </Text>
            <span className="sr-only">
              {bucket.plays} plays on {bucket.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
