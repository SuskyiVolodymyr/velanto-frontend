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
export function BackButton({ href, className }: BackButtonProps) {
  const t = useTranslations("pages");

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-foreground-secondary transition-colors hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft size={16} aria-hidden />
      {t("back")}
    </Link>
  );
}
