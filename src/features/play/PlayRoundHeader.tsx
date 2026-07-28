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
   * screen. Logical, not `text-left` — 3 of 8 locales are RTL. */
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

  return (
    <div>
      <div
        className={cn(
          "flex gap-4",
          isCentered
            ? "flex-col items-center text-center"
            : "items-start text-start",
        )}
      >
        <div
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tile border border-acc/30 bg-acc/[0.12] font-mono text-xl font-bold text-acc"
        >
          {roundNumber}
        </div>

        <div className={cn("min-w-0", isCentered && "flex flex-col items-center")}>
          <div
            className={cn(
              "flex items-center gap-[9px]",
              isCentered && "justify-center",
            )}
          >
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
            className="text-[clamp(26px,3.6vw,40px)] leading-[1.06] tracking-[-0.02em]"
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

      {totalRounds > 0 && (
        <div
          className={cn(
            "mt-4 flex items-center gap-3",
            isCentered && "mx-auto max-w-[420px] justify-center",
          )}
        >
          <div className="flex flex-1 gap-1">
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
          <Text
            variant="tertiary"
            className="shrink-0 text-[11.5px] tabular-nums"
          >
            {t("roundsDoneNote", { count: roundIndex })}
          </Text>
        </div>
      )}
    </div>
  );
}
