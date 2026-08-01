import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

export type PlayRoundHeaderAlign = "start" | "center";

export interface PlayRoundHeaderProps {
  /** Uppercase eyebrow label, e.g. a translated format name. Rendered
   * alongside — not replaced by — the round-number badge/progress dashes
   * below, since not every caller's eyebrow is round-position text (e.g.
   * rank_blind's pool name, 1v1's format name). */
  eyebrow: string;
  /** The round title. Rendered as an `h2` — the page's `h1` is `PlayChrome`'s
   * pack title, not this. */
  title: string;
  /** Optional instruction line beneath the title. */
  instruction?: string;
  /** `"center"` (default) for nxn/1v1/rank; `"start"` for the elimination
   * screen. Logical, not `text-left` — 2 of 8 locales (ar, ur) are RTL. */
  align?: PlayRoundHeaderAlign;
  /** 0-based index of the round this header describes, and the total round
   * count — drive the round-number badge tile and the segmented progress-dash
   * row that replaced `PlayChrome`'s full-bleed rail (T1/T2, see
   * docs/superpowers/plans/2026-07-28-solo-play-results-mock-patch.md). */
  roundIndex: number;
  totalRounds: number;
}

/**
 * The round-number badge + eyebrow + title + instruction block every play
 * screen opens with, plus a segmented per-round progress-dash row — shared
 * chrome extracted once across all four play mocks.
 *
 * Uses the `play` i18n namespace for the dash row's "N rounds done" note —
 * everything else is still caller-supplied strings, so callers keep full
 * control over the eyebrow/title/instruction copy.
 */
export function PlayRoundHeader({
  eyebrow,
  title,
  instruction,
  align = "center",
  roundIndex,
  totalRounds,
}: PlayRoundHeaderProps) {
  const t = useTranslations("play");
  const isCentered = align === "center";
  const roundNumber = roundIndex + 1;

  // The dash row + "N rounds done" note (mock: a column pinned to the far
  // right of the header row via margin-left:auto, not a full-width row under
  // the title) — shared by both alignments below.
  const progressRail = totalRounds > 0 && (
    <div className="flex min-w-[170px] flex-col gap-[7px]">
      <div className="flex gap-1">
        {Array.from({ length: totalRounds }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              "h-[3px] flex-1 rounded-pill",
              index < roundIndex
                ? "bg-acc"
                : index === roundIndex
                  ? "bg-acc/50"
                  : "bg-white/[0.08]",
            )}
          />
        ))}
      </div>
      <Text variant="tertiary" className="text-end text-[11.5px] tabular-nums">
        {t("roundsDoneNote", { count: roundIndex })}
      </Text>
    </div>
  );

  if (!isCentered) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-4 text-start">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tile border border-acc/30 bg-acc/[0.12] font-mono text-xl font-bold text-acc"
          >
            {roundNumber}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-[9px]">
              <span
                aria-hidden="true"
                className="h-[6px] w-[6px] rounded-pill bg-acc animate-livedot"
              />
              <Text
                variant="tertiary"
                className="text-[12.5px] font-medium uppercase tracking-[0.16em]"
              >
                {eyebrow}
              </Text>
            </div>
            <Text
              as="h2"
              variant="title"
              className="text-[clamp(26px,3.6vw,40px)] leading-[1.06] tracking-[-0.02em] max-[720px]:text-[22px]"
            >
              {title}
            </Text>
            {instruction && (
              <Text variant="secondary" className="mt-2 text-[14.5px]">
                {instruction}
              </Text>
            )}
          </div>

          {progressRail && <div className="ms-auto">{progressRail}</div>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tile border border-acc/30 bg-acc/[0.12] font-mono text-xl font-bold text-acc"
        >
          {roundNumber}
        </div>

        <div className="flex min-w-0 flex-col items-center">
          <div className="flex items-center justify-center gap-[9px]">
            <span
              aria-hidden="true"
              className="h-[6px] w-[6px] rounded-pill bg-acc animate-livedot"
            />
            <Text
              variant="tertiary"
              className="text-[12.5px] font-medium uppercase tracking-[0.16em]"
            >
              {eyebrow}
            </Text>
          </div>
          <Text
            as="h2"
            variant="title"
            className="text-[clamp(26px,3.6vw,40px)] leading-[1.06] tracking-[-0.02em] max-[720px]:text-[22px]"
          >
            {title}
          </Text>
          {instruction && (
            <Text variant="secondary" className="mt-2 text-[14.5px]">
              {instruction}
            </Text>
          )}
        </div>
      </div>

      {progressRail && (
        <div className="mx-auto mt-4 max-w-[420px]">{progressRail}</div>
      )}
    </div>
  );
}
