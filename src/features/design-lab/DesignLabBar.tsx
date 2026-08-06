"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { SegmentedControl } from "@/src/shared/components/SegmentedControl";
import { pageContainer } from "@/src/shared/lib/page-container";
import { cn } from "@/src/shared/lib/cn";
import { LAB_SCREENS } from "./screens";

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
/** One dimension the current lab page can be varied along. */
export interface LabSwitcher {
  /** What it varies — "Mode", "Format", "Viewer". */
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function DesignLabBar({ switchers }: { switchers: LabSwitcher[] }) {
  const pathname = usePathname();

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
        <nav
          aria-label="Design lab screens"
          className="flex items-center gap-1"
        >
          {LAB_SCREENS.map((screen) => (
            <Link
              key={screen.href}
              href={screen.href}
              aria-current={pathname === screen.href ? "page" : undefined}
              className={cn(
                "rounded-control px-2.5 py-1 text-[13px] font-semibold transition-colors",
                pathname === screen.href
                  ? "bg-white/10 text-foreground"
                  : "text-foreground-tertiary hover:text-foreground-secondary",
              )}
            >
              {screen.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex flex-wrap items-center gap-x-3 gap-y-2">
          {switchers.map((switcher) => (
            <div key={switcher.label} className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-[0.04em] text-foreground-tertiary uppercase">
                {switcher.label}
              </span>
              <SegmentedControl
                ariaLabel={switcher.label}
                options={switcher.options}
                value={switcher.value}
                onChange={switcher.onChange}
              />
            </div>
          ))}
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
