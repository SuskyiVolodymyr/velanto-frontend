"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useStreamerModeOrDefault } from "@/src/shared/lib/streamer-mode-context";
import { cn } from "@/src/shared/lib/cn";

export type HiddenKind = "avatar" | "name" | "comment";

export interface HiddenProps {
  kind: HiddenKind;
  /** Stable id for per-item reveal — userId for avatar/name, commentId for comments. */
  id: string;
  children: ReactNode;
  className?: string;
}

/**
 * Redacts a single piece of user identity (avatar, name, or comment) while
 * streamer mode is on, until the viewer reveals that specific item.
 *
 * Flash prevention: children are always wrapped in a `[data-streamer-hideable]`
 * element. Before hydration `enabled` reads `false`, so children render — but
 * the globals.css blunt rule keeps them visually hidden while
 * `html[data-streamer-mode="on"]` and no `data-streamer-hydrated` yet. After
 * mount React renders the placeholder for hidden items instead, so real
 * identity never paints.
 *
 * The translated placeholder lives in a child component rendered only when an
 * item is actually hidden, so the pass-through path pulls in no i18n context —
 * `<Hidden>` can wrap content anywhere without forcing a NextIntl provider.
 */
export function Hidden({ kind, id, children, className }: HiddenProps) {
  const { enabled, isRevealed, reveal } = useStreamerModeOrDefault();

  const hidden = enabled && !isRevealed(id);
  const Wrapper = kind === "comment" ? "div" : "span";

  if (!hidden) {
    return (
      <Wrapper data-streamer-hideable="" className={className}>
        {children}
      </Wrapper>
    );
  }

  return (
    <HiddenPlaceholder kind={kind} className={className} onReveal={() => reveal(id)} />
  );
}

function HiddenPlaceholder({
  kind,
  className,
  onReveal,
}: {
  kind: HiddenKind;
  className?: string;
  onReveal: () => void;
}) {
  const t = useTranslations("streamerMode");
  const hintId = useId();
  const hint = t("hiddenHint");
  const Wrapper = kind === "comment" ? "div" : "span";

  const revealButton = (
    <button
      type="button"
      onClick={onReveal}
      aria-describedby={hintId}
      className={cn(
        "rounded-[8px] text-xs font-medium text-acc transition-colors hover:brightness-110",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {t("reveal")}
    </button>
  );

  if (kind === "avatar") {
    // Too small for inline copy — the neutral blurred circle is itself the
    // reveal control; the hint rides along as its accessible description.
    return (
      <Wrapper data-streamer-hideable="" className={cn("inline-flex", className)}>
        <button
          type="button"
          onClick={onReveal}
          aria-label={`${t("reveal")} — ${hint}`}
          className={cn(
            "h-full w-full rounded-full border border-border bg-surface",
            "bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.06)_0_6px,transparent_6px_12px)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        />
      </Wrapper>
    );
  }

  if (kind === "name") {
    return (
      <Wrapper data-streamer-hideable="" className={cn("inline-flex items-baseline gap-1.5", className)}>
        <span className="italic text-foreground-tertiary" title={hint}>
          {t("hiddenName")}
        </span>
        {revealButton}
        <span id={hintId} className="sr-only">
          {hint}
        </span>
      </Wrapper>
    );
  }

  // kind === "comment"
  return (
    <Wrapper
      data-streamer-hideable=""
      className={cn(
        "flex flex-col items-start gap-1 rounded-[10px] border border-dashed border-border-strong bg-white/[0.02] px-3 py-2.5",
        className,
      )}
    >
      <span id={hintId} className="text-xs text-foreground-tertiary">
        {hint}
      </span>
      {revealButton}
    </Wrapper>
  );
}
