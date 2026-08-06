"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { SegmentedControl } from "@/src/shared/components/SegmentedControl";
import { pageContainer } from "@/src/shared/lib/page-container";
import { cn } from "@/src/shared/lib/cn";

/**
 * The lab's own chrome, sitting above whatever screen is being worked on.
 *
 * Deliberately loud and deliberately un-themed: it must never be mistaken for
 * part of the screen underneath it, because everything below this bar is meant
 * to be judged as production UI. It is also the only way out — a play screen
 * hides the nav rail, so without this the lab would be a dead end.
 *
 * English-only on purpose. Nothing here ships to a user, so putting it through
 * the message catalogs would cost eight locales per label for no reader.
 */
export function DesignLabBar<T extends string>({
  title,
  options,
  value,
  onChange,
  switcherLabel,
}: {
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** What the switcher varies — "Mode", "Format", "Phase". */
  switcherLabel: string;
}) {
  return (
    <div className="border-b border-dashed border-acc/40 bg-acc/[0.06]">
      <div
        className={cn(
          pageContainer(1320),
          "flex flex-wrap items-center gap-x-4 gap-y-2.5 py-2.5",
        )}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-acc uppercase">
          <FlaskConical size={13} aria-hidden />
          Design lab
        </span>
        <span className="text-[13px] font-semibold text-foreground">
          {title}
        </span>

        <div className="ms-auto flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-[0.04em] text-foreground-tertiary uppercase">
            {switcherLabel}
          </span>
          <SegmentedControl
            ariaLabel={switcherLabel}
            options={options}
            value={value}
            onChange={onChange}
          />
          {/* The rail is hidden on a play screen, so this is the exit. */}
          <Link
            href="/"
            className="rounded-control px-2.5 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:text-foreground"
          >
            Exit
          </Link>
        </div>
      </div>
    </div>
  );
}
