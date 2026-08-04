import type { ReactNode } from "react";
import Link from "next/link";
import { BackButton } from "@/src/shared/components/BackButton";
import { ResolvedBackButton } from "@/src/shared/components/ResolvedBackButton";
import type { FROM } from "@/src/shared/lib/back-origins";
import { BrandMark } from "@/src/shared/components/BrandMark";
import { SidebarToggle } from "@/src/shared/components/SidebarToggle";
import { HeaderUserCluster } from "@/src/shared/components/HeaderUserCluster";
import { cn } from "@/src/shared/lib/cn";
import { STICKY_HEADER_SHELL_CLASS } from "@/src/shared/lib/sticky-header-shell";

export interface PageHeaderProps {
  /**
   * Left control, mode 1: a labeled back pill (mock: "Browse"/"Queue"/"Back"
   * style bars — Rules, Suggestions, Profile, Moderation Review, Suggestion
   * Detail, Admin User Detail, Preferences). Mutually exclusive with `brand`.
   */
  back?: {
    href: string;
    label: string;
  };
  /**
   * Pages this screen is willing to return to when it was opened from one of
   * them — keys of `FROM` in back-origins.ts. `back` then names the fallback
   * for every other arrival (a shared link, a route this list doesn't cover).
   *
   * An allow-list per screen rather than plain browser-back: "wherever you
   * came from" sends someone back into the editor they just left, or into a
   * finished play session, which is what #353 removed history for. Naming the
   * origins keeps the useful half and drops that.
   */
  backFrom?: (keyof typeof FROM)[];
  /**
   * Left control, mode 2: the VELANTO logo + wordmark linking home (mock:
   * "breadcrumb" bars — Admin, Docs, Legal, Moderation, Updates). Mutually
   * exclusive with `back`.
   */
  brand?: boolean;
  /**
   * The section name shown beside the left control. With `brand`, it's
   * preceded by a "/" separator (mock: "VELANTO / Admin"). With `back`, it
   * sits directly after the pill with no separator (mock: "‹ Queue  Report
   * #42"), and shrinks the pill to the mock's compact drill-down sizing.
   */
  crumb?: string;
  /** A small pill beside the crumb (mock: ADMIN/STAFF badges). */
  badge?: ReactNode;
  /** Secondary text after the crumb (mock: a mono short id). */
  meta?: ReactNode;
  /** Right-aligned actions. */
  trailing?: ReactNode;
  className?: string;
}

/**
 * The reusable full-width sticky page header — every route except the
 * dashboard (which keeps {@link AppTopBar}) and `/auth` (full-screen, no
 * chrome at all) gets one of these. Mirrors the mock's two literal header
 * variants: a "back pill" bar for sub-pages of a listing (Rules, Profile,
 * Suggestions, drill-downs) and a "brand breadcrumb" bar for top-level
 * sections that aren't reached by drilling into something (Admin, Docs,
 * Legal, Moderation, Preferences, Updates).
 *
 * Deliberately NOT capped to the page column (`pageContainer`) — the
 * mock's own header spans edge to edge regardless of how narrow the page
 * body underneath it is.
 */
export function PageHeader({
  back,
  backFrom,
  brand,
  crumb,
  badge,
  meta,
  trailing,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn(STICKY_HEADER_SHELL_CLASS, className)}>
      {/* Leftmost, before the back pill / brand: the rail's toggle. Off the
          dashboard there is no AppTopBar to carry it, so each page's own
          header does. Desktop-only and self-hiding when no rail exists. */}
      <SidebarToggle />
      {back &&
        (backFrom ? (
          <ResolvedBackButton
            fallbackHref={back.href}
            fallbackLabel={back.label}
            from={backFrom}
            className={
              crumb ? "h-9 gap-[7px] rounded-[10px] ps-[9px] pe-3" : undefined
            }
          />
        ) : (
          <BackButton
            href={back.href}
            label={back.label}
            // Mock: paired with a crumb (drill-down pages), the pill shrinks
            // to its compact 36px sizing; bare (Rules/Suggestions/Profile's
            // "Browse", nothing else in the left cluster) it stays the
            // default 38px.
            className={
              crumb ? "h-9 gap-[7px] rounded-[10px] ps-[9px] pe-3" : undefined
            }
          />
        ))}
      {brand && (
        <Link
          href="/"
          aria-label="Velanto"
          className="flex flex-none items-center gap-[9px] text-foreground"
        >
          <BrandMark className="h-[26px] w-[26px]" />
          <span className="text-[13px] font-bold tracking-[.2em]">VELANTO</span>
        </Link>
      )}
      {brand && crumb && (
        <span aria-hidden className="text-foreground-tertiary/40">
          /
        </span>
      )}
      {crumb && (
        <span className="text-[13.5px] font-semibold text-foreground">
          {crumb}
        </span>
      )}
      {badge}
      {meta}
      {/* Always rendered, where it used to depend on `trailing`: the account
          controls live at the far right of every header now, so the group is
          no longer optional. Page-specific actions come first and the global
          cluster is last, so the account controls stay in the same place on
          every route regardless of what the page itself puts here. */}
      <div className="ms-auto flex flex-wrap items-center gap-2.5">
        {trailing}
        <HeaderUserCluster />
      </div>
    </header>
  );
}
