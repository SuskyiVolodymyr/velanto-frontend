"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("admin");
  // Scale to the busiest day. `|| 1` guards an all-zero week — without it every
  // bar would divide by zero; with it they all render at the 2px floor instead.
  const peak = Math.max(...buckets.map((b) => b.plays), 0) || 1;

  return (
    <div className="rounded-[16px] border border-border bg-white/[0.02] px-[22px] py-5">
      <Text
        variant="tertiary"
        className="mb-[18px] text-xs font-semibold uppercase tracking-[0.1em]"
      >
        {t("playsChartTitle")}
      </Text>
      <div className="flex h-[120px] items-end gap-2.5">
        {buckets.map((bucket) => (
          <div
            key={bucket.date}
            // `group` + `relative` so the bar's count can surface on hover of
            // anywhere in the column, not just the (possibly 2px-tall) bar.
            className="group relative flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            {/* The exact count, revealed on hover/focus. Pointer-events-none so
                it can never swallow the hover that summoned it. */}
            <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-semibold tabular-nums text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {bucket.plays}
            </div>
            <button
              type="button"
              // Focusable so the count is reachable by keyboard too, not just a
              // mouse. The accessible name carries the same fact as the tooltip.
              aria-label={`${bucket.plays} plays on ${bucket.date}`}
              className="w-full max-w-[34px] rounded-t-md bg-gradient-to-b from-acc to-acc/40 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
              // Percentage of the tallest bar, with a 2px floor so a zero day is
              // still a visible baseline tick rather than nothing at all.
              style={{
                height: `${Math.max((bucket.plays / peak) * 100, 2)}%`,
              }}
            />
            <Text variant="tertiary" className="text-[10.5px]">
              {dayLabel(bucket.date)}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}
