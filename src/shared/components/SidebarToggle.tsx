"use client";

import { useTranslations } from "next-intl";
import { MenuIcon } from "@/src/shared/components/icons";
import { useSidebar } from "@/src/shared/lib/sidebar-context";

/**
 * The rail's expand/collapse control, for pages that carry their own sticky
 * header instead of the dashboard's {@link AppTopBar}.
 *
 * Lives leftmost in {@link PageHeader} so every chromed route has one. It is a
 * separate client island rather than logic inside PageHeader because PageHeader
 * is a Server Component rendered from Server Component pages — making the whole
 * header client-side to gain one button would opt those pages out of static
 * rendering for no benefit.
 *
 * Renders nothing when there is no rail to control (no provider — `/auth`, or a
 * header under unit test), so it never leaves a dead button behind.
 */
export function SidebarToggle() {
  const t = useTranslations("shell");
  const { collapsed, toggle, available } = useSidebar();

  if (!available) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("menuToggle")}
      aria-expanded={!collapsed}
      // Hidden below 881px: there the rail is gone entirely and navigation is
      // the MobileBottomNav's job, so a drawer toggle here would duplicate it
      // and crowd headers that are already tight on a phone.
      className="hidden h-9 w-9 flex-none place-items-center rounded-[10px] bg-surface-control text-foreground-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc min-[881px]:grid"
    >
      <MenuIcon size={18} strokeWidth={2} />
    </button>
  );
}
