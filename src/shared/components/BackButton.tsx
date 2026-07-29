import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/lib/cn";

export interface BackButtonProps {
  /**
   * Where "Back" goes — always, not just when there's no history to pop.
   * Required: a Back control with an implied destination is exactly what this
   * replaced (#353).
   */
  href: string;
  /**
   * Overrides the default "Back". This control names a PLACE rather than a
   * direction (see below), so a caller whose destination isn't obvious from
   * context can say where it goes — "Back to pack" from a finished room, which
   * is reached from a link and has no history worth implying.
   */
  label?: string;
  className?: string;
}

/**
 * A "← Back" control for sub-pages, pointing at one fixed page.
 *
 * It used to call `router.back()` and treat this href as a fallback for
 * visitors who arrived directly. That made the same control land somewhere
 * different depending on the route taken in: back out of a result into the play
 * session just finished, back out of a pack into a search long since moved on
 * from. "Back" now names a place rather than a direction.
 *
 * A real `<Link>`, not a button running `router.push`: the destination is known
 * at render, so middle-click, open-in-new-tab and the browser's own status-bar
 * preview should all work.
 */
export function BackButton({ href, label, className }: BackButtonProps) {
  const t = useTranslations("pages");

  const text = label ?? t("back");

  return (
    <Link
      href={href}
      // aria-label carries the accessible name at every width — an
      // aria-label always wins accessible-name computation over visible
      // text, so collapsing the label to icon-only below 481px (a crowded
      // sticky header's narrowest controls) never leaves the link unnamed.
      aria-label={text}
      className={cn(
        "inline-flex h-[38px] items-center gap-2 rounded-[11px] border border-border bg-surface-card ps-[10px] pe-[14px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:border-border-strong hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft size={16} aria-hidden />
      <span aria-hidden className="hidden min-[481px]:inline">
        {text}
      </span>
    </Link>
  );
}
