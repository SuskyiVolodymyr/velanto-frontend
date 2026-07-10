"use client";

import type { Item } from "@/src/shared/types/pack";

interface GroupItemListProps {
  items: Item[];
  onRemove: (itemId: string) => void;
}

/** The chip list of already-added items, each with an inline remove control. */
export function GroupItemList({ items, onRemove }: GroupItemListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item.id}
          className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-white/[0.04] px-2.5 py-1 text-sm text-foreground"
        >
          {item.title}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.title}`}
            className="text-foreground-tertiary hover:text-[#ff6b6b]"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
