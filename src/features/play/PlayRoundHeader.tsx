import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

export type PlayRoundHeaderAlign = "start" | "center";

export interface PlayRoundHeaderProps {
  /** Uppercase eyebrow label, e.g. a translated format name. */
  eyebrow: string;
  /** The round title. Rendered as an `h2` — the page's `h1` is `PlayChrome`'s
   * pack title, not this. */
  title: string;
  /** Optional instruction line beneath the title. */
  instruction?: string;
  /** `"center"` (default) for nxn/1v1/rank; `"start"` for the elimination
   * screen. Logical, not `text-left` — 3 of 8 locales are RTL. */
  align?: PlayRoundHeaderAlign;
}

/**
 * The eyebrow + title + instruction block every play screen opens with —
 * shared chrome extracted once across all four play mocks (see
 * docs/superpowers/plans/2026-07-28-solo-play-results-redesign.md, T3).
 *
 * Purely presentational: every string is caller-supplied (translated eyebrow
 * copy, round title, instruction), so this component has no i18n dependency
 * of its own.
 */
export function PlayRoundHeader({
  eyebrow,
  title,
  instruction,
  align = "center",
}: PlayRoundHeaderProps) {
  const isCentered = align === "center";

  return (
    <div className={isCentered ? "text-center" : "text-start"}>
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
  );
}
