"use client";

import { useTranslations } from "next-intl";
import type { Item } from "@/src/shared/types/pack";
import { cn } from "@/src/shared/lib/cn";

interface GroupItemListProps {
  items: Item[];
  /** Id of the item currently lifted into the form row, if any. */
  editingItemId?: string | null;
  onEdit: (item: Item) => void;
  onRemove: (itemId: string) => void;
}

/**
 * The chip list of already-added items. Clicking a chip lifts it into the form
 * row for editing; the × removes it outright.
 *
 * The chip being edited stays mounted but is dimmed rather than unmounted, so
 * the row below doesn't jump as the list reflows — and, more importantly, the
 * item is still in the group the whole time, so abandoning an edit can't lose it.
 */
export function GroupItemList({
  items,
  editingItemId,
  onEdit,
  onRemove,
}: GroupItemListProps) {
  const t = useTranslations("create");
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const editing = item.id === editingItemId;
        return (
          <li
            key={item.id}
            className={cn(
              "inline-flex items-center gap-2 rounded-[8px] border px-2.5 py-1 text-sm transition-colors",
              editing
                ? "border-acc bg-acc/10 text-foreground-tertiary"
                : "border-border bg-white/[0.04] text-foreground",
            )}
          >
            <button
              type="button"
              onClick={() => onEdit(item)}
              aria-label={t("editItemAria", { title: item.title })}
              className="max-w-[220px] truncate text-left hover:text-acc"
            >
              {item.title}
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={t("removeItemAria", { title: item.title })}
              className="text-foreground-tertiary hover:text-danger"
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}
