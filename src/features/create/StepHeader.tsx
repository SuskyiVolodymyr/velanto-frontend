import type { ReactNode } from "react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

/**
 * The mock's section header, reused across the four Create Pack sections
 * (Format/Basics/Pools/Rounds): a small-caps accent-colored label, no
 * numbered badge. Purely presentational — every string is supplied by the
 * caller, so it carries no i18n dependency of its own.
 *
 * Plain `<h2>`, not `Text` — `Text`'s own default `variant="body"` class
 * (`text-foreground`) always wins a color fight against a className-supplied
 * color like `text-acc` (cn() is a plain join, not tailwind-merge; see
 * Text.tsx's own doc comment), which silently rendered this heading white
 * instead of the mock's cyan.
 */
export function StepHeader({
  title,
  aside,
  hint,
}: {
  title: string;
  aside?: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-[10px]",
          hint ? "mb-2" : "mb-[13px]",
        )}
      >
        <h2 className="m-0 text-[12px] font-bold uppercase tracking-[.14em] text-acc">
          {title}
        </h2>
        {aside && (
          <Text variant="tertiary" className="ms-auto text-[12.5px]">
            {aside}
          </Text>
        )}
      </div>
      {hint && (
        <Text variant="tertiary" className="mb-[13px] text-[12.5px]">
          {hint}
        </Text>
      )}
    </div>
  );
}
