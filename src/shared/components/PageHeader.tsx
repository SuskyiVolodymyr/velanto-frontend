import type { ReactNode } from "react";
import Link from "next/link";
import { BackButton } from "@/src/shared/components/BackButton";
import { BrandMark } from "@/src/shared/components/BrandMark";
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
 * Deliberately NOT capped to the reading column (`PACK_CONTAINER`) — the
 * mock's own header spans edge to edge regardless of how narrow the page
 * body underneath it is.
 */
export function PageHeader({
  back,
  brand,
  crumb,
  badge,
  meta,
  trailing,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn(STICKY_HEADER_SHELL_CLASS, className)}>
      {back && (
        <BackButton
          href={back.href}
          label={back.label}
          // Mock: paired with a crumb (drill-down pages), the pill shrinks
          // to its compact 36px sizing; bare (Rules/Suggestions/Profile's
          // "Browse", nothing else in the left cluster) it stays the
          // default 38px.
          className={crumb ? "h-9 gap-[7px] rounded-[10px] ps-[9px] pe-3" : undefined}
        />
      )}
      {brand && (
        <Link
          href="/"
          aria-label="Velanto"
          className="flex flex-none items-center gap-[9px] text-foreground"
        >
          <BrandMark className="h-[26px] w-[26px]" />
          <span className="text-[13px] font-bold tracking-[.2em]">
            VELANTO
          </span>
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
      {trailing && (
        <div className="ms-auto flex flex-wrap items-center gap-2.5">
          {trailing}
        </div>
      )}
    </header>
  );
}
