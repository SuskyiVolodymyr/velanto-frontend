import type { ReactNode } from "react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

/**
 * The mock's numbered section header, reused across the four Create Pack
 * steps (Basics/Format/Pools/Rounds). Purely presentational — every string is
 * supplied by the caller, so it carries no i18n dependency of its own.
 *
 * Owns the vertical gap down to whatever body follows: 18px when there's no
 * hint, or 8px down to the hint paragraph (which then supplies the remaining
 * 18px itself) — so callers don't need to add their own spacing after it.
 */
export function StepHeader({
  step,
  title,
  aside,
  hint,
}: {
  step: number;
  title: string;
  aside?: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-[11px]",
          hint ? "mb-2" : "mb-[18px]",
        )}
      >
        <span
          aria-hidden
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px] border border-border bg-white/[0.06] text-[13px] font-semibold text-foreground-secondary"
        >
          {step}
        </span>
        <Text as="h2" className="text-[18px] font-semibold tracking-[-0.01em]">
          {title}
        </Text>
        {aside && (
          <Text variant="tertiary" className="ms-auto text-[12.5px]">
            {aside}
          </Text>
        )}
      </div>
      {hint && (
        <Text variant="tertiary" className="ms-[37px] mb-[18px] text-[13px]">
          {hint}
        </Text>
      )}
    </div>
  );
}
