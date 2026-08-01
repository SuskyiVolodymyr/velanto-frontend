import type { ReactNode } from "react";
import { Info } from "lucide-react";

/**
 * The shapes every docs topic is built from, per `Docs.dc.html`. Shared so a
 * topic rendered from its own component (ApiDocs) can't drift from the ones
 * rendered inline in DocsArticle — they already had.
 */

/** Body paragraph: 15px / 1.75. */
export const PROSE =
  "text-[15px] leading-[1.75] text-pretty text-foreground-secondary";

/** Topic title. Each topic renders exactly one. */
export const H1 =
  "text-[30px] font-bold leading-tight tracking-[-0.025em] text-pretty text-foreground";

/** Section heading within a topic. */
export const H2 =
  "mt-2 text-[19px] font-bold tracking-[-0.015em] text-pretty text-foreground";

/** Info card / format row / step: 15px radius, hairline border, surface fill. */
export const PANEL = "rounded-[15px] border border-border bg-surface-card";

/**
 * The mock's cyan-tinted aside — used where a topic ends on a caveat the reader
 * must not skim past (publishing goes to moderation; a token acts as you).
 */
export function DocsNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-[11px] rounded-[14px] border border-acc/[0.22] bg-acc/[0.05] px-4 py-[15px]">
      <Info
        size={16}
        strokeWidth={2}
        aria-hidden
        className="mt-0.5 flex-none text-acc"
      />
      <span className="text-[13.5px] leading-[1.65] text-pretty text-foreground/70">
        {children}
      </span>
    </div>
  );
}
