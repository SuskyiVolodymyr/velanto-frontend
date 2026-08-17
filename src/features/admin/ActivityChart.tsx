"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Text } from "@/shared/ui/Text";
import { useAdminActivity } from "@/features/admin/api/admin.queries";
import {
  ACTIVITY_RANGES,
  type ActivityPoint,
  type ActivityRange,
} from "@/shared/types/admin";

/** Unknown or missing `?range=` falls back to the narrowest view. */
export function rangeFromParam(value: string | null): ActivityRange {
  return (ACTIVITY_RANGES as readonly string[]).includes(value ?? "")
    ? (value as ActivityRange)
    : "day";
}

/**
 * Axis label for a point: the hour on the day view, the calendar day otherwise.
 *
 * The two ranges are deliberately rendered in DIFFERENT zones, because they are
 * different kinds of thing.
 *
 * An hourly point is an instant, so it is shown in the reader's own time — the
 * first version printed UTC here and an admin in Kyiv saw the latest bar
 * labelled three hours before their own clock, which reads as a broken chart
 * rather than as a timezone.
 *
 * A daily point is not an instant: the backend groups hours into days in UTC,
 * so the bucket IS a UTC day. Relabelling it locally would name it after a day
 * whose hours it does not contain, sliding every point for readers away from
 * Greenwich. It therefore stays UTC, matching how it was cut.
 *
 * ⚠️ Reading the machine's own timezone during render is normally a hydration
 * hazard: Next renders this on the server too, where the zone is UTC, and the
 * browser would then produce different text. It is safe ONLY because the chart
 * has no SSR seed — `useAdminActivity` fetches client-side, so the server
 * render has no points and emits no labels at all. Give this query
 * `initialData` and the labels start mismatching; render them in an effect (or
 * suppress hydration warnings) if you ever do.
 */
function pointLabel(at: string, range: ActivityRange): string {
  const date = new Date(at);
  return range === "day"
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      });
}

/**
 * Unique players over time, filtered to a day, week or month.
 *
 * **A week or month point is a day's BUSIEST HOUR, not a daily total.** Unique
 * visitors cannot be summed across hours — someone active at 09:00 and again at
 * 14:00 is one person, and nothing stored can tell that apart from two people.
 * The chart says so in a footnote rather than quietly showing an inflated
 * number, and the accessible name on every bar repeats it.
 *
 * The range lives in the URL for the same reason `?tab=` does: a shared
 * /admin?tab=overview&range=month link has to open on the month, and a refresh
 * must not throw the reader back to the day view.
 */
export function ActivityChart() {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = rangeFromParam(searchParams.get("range"));
  const activityQuery = useAdminActivity(range);
  const points: ActivityPoint[] = activityQuery.data ?? [];

  const setRange = useCallback(
    (next: ActivityRange) => {
      const params = new URLSearchParams(searchParams.toString());
      // The day view is the default, so it writes no parameter — a bare
      // /admin?tab=overview already says the same thing.
      if (next === "day") params.delete("range");
      else params.set("range", next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams],
  );

  // Scale to the busiest point. `|| 1` guards an all-zero span — without it
  // every bar would divide by zero; with it they all sit at the 2px floor.
  const peak = Math.max(...points.map((p) => p.unique), 0) || 1;

  // How often to print an axis label. A 24-hour day and a 30-day month cannot
  // carry one per bar at this width without overlapping into a smear; a week
  // can, and every day of it is worth naming.
  const labelEvery = range === "day" ? 4 : range === "month" ? 5 : 1;

  return (
    <div className="rounded-[16px] border border-border bg-white/[0.02] px-[22px] py-5">
      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <Text
          variant="tertiary"
          className="text-xs font-semibold uppercase tracking-[0.1em]"
        >
          {t("activityChartTitle")}
        </Text>
        <div
          role="tablist"
          aria-label={t("activityRangeLabel")}
          className="ms-auto flex gap-1"
        >
          {ACTIVITY_RANGES.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={range === option}
              onClick={() => setRange(option)}
              className={
                range === option
                  ? "rounded-md bg-acc/20 px-2.5 py-1 text-[11px] font-semibold text-acc-hover"
                  : "rounded-md px-2.5 py-1 text-[11px] font-semibold text-foreground-tertiary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
              }
            >
              {t(`activityRange_${option}`)}
            </button>
          ))}
        </div>
      </div>

      {activityQuery.isError ? (
        <Text variant="danger">{t("activityError")}</Text>
      ) : (
        <>
          <div className="flex h-[120px] items-end gap-1.5">
            {points.map((point) => (
              <div
                key={point.at}
                // `group` + `relative` so a column's figures surface on hover
                // of anywhere in it, not just the (possibly 2px-tall) bar.
                className="group relative flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                {/* The moment leads the tooltip: the axis below can only
                    afford a label every few bars, so hovering is how you find
                    out exactly when a spike happened. */}
                <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-semibold tabular-nums text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <span className="me-2">{pointLabel(point.at, range)}</span>
                  <span className="text-foreground-secondary">
                    {point.unique}
                  </span>
                  <span className="ms-2 font-normal text-foreground-tertiary">
                    {t("livePlayersBreakdown", {
                      registered: point.registered,
                      guests: point.guests,
                      anonymous: point.anonymous,
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  // Focusable so the figures are reachable by keyboard too. The
                  // accessible name states the PEAK reading explicitly on the
                  // aggregated ranges — a screen-reader user must not be left
                  // to infer it from a footnote they may never reach.
                  aria-label={t(
                    range === "day" ? "activityBarHour" : "activityBarDayPeak",
                    {
                      count: point.unique,
                      at: pointLabel(point.at, range),
                    },
                  )}
                  className="w-full max-w-[34px] rounded-t-md bg-gradient-to-b from-acc to-acc/40 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
                  // Percentage of the tallest bar, with a 2px floor so a quiet
                  // period is a visible baseline tick rather than nothing.
                  style={{
                    height: `${Math.max((point.unique / peak) * 100, 2)}%`,
                  }}
                />
              </div>
            ))}
          </div>
          {/* A second row of the same flex-1 columns and the same gap, so each
              label sits under its own bar. Only every Nth is printed — 24
              hourly labels at this width overlap into an unreadable smear —
              and the last point always gets one, since "how recent is this
              chart" is the first thing a reader checks. The exact moment of
              every other bar is one hover away. */}
          <div className="mt-2 flex gap-1.5">
            {points.map((point, index) => (
              <div key={point.at} className="min-w-0 flex-1 text-center">
                {(index % labelEvery === 0 || index === points.length - 1) && (
                  <Text
                    variant="tertiary"
                    className="block truncate text-[10.5px] tabular-nums"
                  >
                    {pointLabel(point.at, range)}
                  </Text>
                )}
              </div>
            ))}
          </div>
          {range !== "day" && (
            <Text variant="tertiary" className="mt-2 text-[11px]">
              {t("activityPeakNote")}
            </Text>
          )}
        </>
      )}
    </div>
  );
}
