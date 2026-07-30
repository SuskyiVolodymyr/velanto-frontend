"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { cn } from "@/src/shared/lib/cn";

/**
 * The result aside's ranking card, and the one row shape inside it — the
 * mock's board in `Results.dc.html`: a bold title with a right-aligned note,
 * a flat list of rank/name/headline rows each over a bar and a detail figure,
 * an optional "Show N more", and a footnote behind a hairline.
 *
 * Shared by BOTH boards rather than duplicated. `PodiumTable` was a six-column
 * `<table>` (rank / item / 1st / 2nd / 3rd / total) that had to scroll
 * sideways inside the 330px aside and wrapped every item title to five lines;
 * there is no mock for rank_blind's board specifically, so it takes the shape
 * the mock DOES define for this slot.
 */
export function BoardCard({
  title,
  note,
  subtitle,
  listLabel,
  children,
  remaining,
  onShowMore,
}: {
  /** Visible bold card title (the mock's `boardTitle`, e.g. "Most saved"). */
  title?: string;
  /** Right-aligned text beside the title (`boardNote`, e.g. "across 2,142
   * plays"). Only shown when `title` is also passed. */
  note?: string;
  /** Footnote at the card's foot. Only shown when `title` is also passed. */
  subtitle?: string;
  /** Accessible name for the list. */
  listLabel: string;
  children: ReactNode;
  /** Rows not yet shown; the button is hidden at 0. */
  remaining: number;
  onShowMore: () => void;
}) {
  const t = useTranslations("result");
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface-card p-5">
      {title && (
        <div className="flex items-baseline gap-[9px]">
          <Text className="text-[14.5px] font-bold">{title}</Text>
          {note && (
            <Text variant="tertiary" className="ms-auto text-[11.5px]">
              {note}
            </Text>
          )}
        </div>
      )}
      <ul aria-label={listLabel} className="flex list-none flex-col gap-[9px]">
        {children}
      </ul>
      {remaining > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="self-center border border-white/[0.12] px-4"
          onClick={onShowMore}
        >
          {t("boardShowMore", { count: remaining })}
        </Button>
      )}
      {subtitle && (
        <Text
          variant="tertiary"
          className="border-t border-border pt-[9px] text-[11.5px] leading-[1.45]"
        >
          {subtitle}
        </Text>
      )}
    </div>
  );
}

/**
 * One board row: rank + name (+ a YOURS pill on the viewer's own) + a headline
 * figure on one line, a bar + a detail figure on the next. Rank 1 gets the
 * amber rank number and the cyan bar/headline; every other row is plain.
 *
 * Plain spans, not `<Text>`: every Text variant sets a colour and `cn()` is a
 * plain join, so the variant's own `text-foreground` beats anything handed in
 * (see Text's doc comment). Measured in the browser, `text-acc-hover` on a
 * `<Text>` renders rgb(238,241,246) — white — which silently killed the mock's
 * cyan first-place figure and YOURS pill. Colour IS this row's content.
 */
export function BoardRow({
  rank,
  name,
  mine,
  headline,
  detail,
  fill,
}: {
  rank: number;
  name: string;
  mine: boolean;
  /** Right-aligned figure on the first line — a percentage, or a count. */
  headline: string;
  /** Small figure beside the bar — the raw numbers behind `headline`. */
  detail: string;
  /** Bar width, 0–100. */
  fill: number;
}) {
  const t = useTranslations("result");
  const isFirst = rank === 1;

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center gap-[10px]">
        <span
          className={cn(
            "w-[15px] shrink-0 font-mono text-xs font-bold",
            isFirst ? "text-score" : "text-foreground-tertiary",
          )}
        >
          {rank}
        </span>
        <span
          className={cn(
            "min-w-0 truncate text-[12.5px] font-semibold tracking-[-0.01em]",
            mine ? "text-foreground" : "text-foreground-secondary",
          )}
        >
          {name}
        </span>
        {mine && (
          <span className="shrink-0 rounded-[6px] bg-acc/[0.16] px-[7px] py-[2px] text-[9.5px] font-bold uppercase tracking-[0.04em] text-acc-hover">
            {t("topPickedYours")}
          </span>
        )}
        <span
          className={cn(
            "ms-auto shrink-0 font-mono text-[12.5px] font-bold tabular-nums",
            isFirst ? "text-acc-hover" : "text-foreground",
          )}
        >
          {headline}
        </span>
      </div>
      <div className="flex items-center gap-[9px]">
        {/* Decorative — the figure right above it already says the same thing
            as text, so this stays out of the accessibility tree. */}
        <span
          aria-hidden
          className="h-[6px] flex-1 overflow-hidden rounded-pill bg-white/[0.06]"
        >
          <span
            className={cn(
              "block h-full rounded-pill",
              isFirst ? "bg-acc" : "bg-white/[0.22]",
            )}
            style={{ width: `${Math.max(0, Math.min(100, fill))}%` }}
          />
        </span>
        <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] text-[rgba(238,241,246,0.38)]">
          {detail}
        </span>
      </div>
    </div>
  );
}
