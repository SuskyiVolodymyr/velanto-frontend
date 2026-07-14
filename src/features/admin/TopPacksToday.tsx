"use client";

import Link from "next/link";
import { Text } from "@/src/shared/components/Text";
import type { TopPackToday } from "@/src/shared/types/admin";

/** The overview's "top packs today" ranked list. */
export function TopPacksToday({ packs }: { packs: TopPackToday[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-white/[0.02] px-[22px] py-5">
      <Text
        variant="tertiary"
        className="text-xs font-semibold uppercase tracking-[0.1em]"
      >
        Top packs today
      </Text>
      {packs.length === 0 ? (
        <Text variant="tertiary" className="py-4 text-sm">
          No plays yet today.
        </Text>
      ) : (
        packs.map((pack, index) => (
          <div key={pack.id} className="flex items-center gap-2.5">
            <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md bg-white/[0.06] text-[11px] font-bold text-foreground-secondary">
              {index + 1}
            </span>
            <Link
              href={`/packs/${pack.id}`}
              className="flex-1 truncate text-[13.5px] font-medium text-foreground hover:text-acc"
            >
              {pack.title}
            </Link>
            <span className="text-[12.5px] tabular-nums text-acc">
              {pack.plays}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
