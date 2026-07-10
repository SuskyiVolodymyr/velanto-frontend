"use client";

import { PACK_TAGS } from "@/src/shared/types/pack";
import type { PackTag } from "@/src/shared/types/pack";
import { Modal } from "@/src/shared/components/Modal";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

export interface TagPickerModalProps {
  open: boolean;
  onClose: () => void;
  selected: PackTag[];
  onChange: (tags: PackTag[]) => void;
  /** When set, unchecked chips disable once `selected.length` reaches this cap. */
  maxTags?: number;
}

export function TagPickerModal({
  open,
  onClose,
  selected,
  onChange,
  maxTags,
}: TagPickerModalProps) {
  function toggle(tag: PackTag) {
    const isSelected = selected.includes(tag);
    if (isSelected) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  }

  const atCap = maxTags !== undefined && selected.length >= maxTags;

  return (
    <Modal open={open} onClose={onClose} title="Select tags">
      <Text variant="tertiary" className="mb-3 text-xs">
        {selected.length} selected{maxTags !== undefined ? ` / ${maxTags}` : ""}
      </Text>
      {/* Chip toggles, matching the pill styling used by the format/sort
          filters. Each pill wraps a visually-hidden real checkbox so multi-select
          semantics, keyboard focus and the disabled-at-cap state stay intact. */}
      <div className="flex flex-wrap gap-2">
        {PACK_TAGS.map((tag) => {
          const isSelected = selected.includes(tag);
          const disabled = !isSelected && atCap;
          return (
            <label key={tag} className="cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => toggle(tag)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "block rounded-[9px] border px-3 py-1.5 text-sm font-medium transition-colors",
                  "border-border bg-white/[0.03] text-foreground-secondary",
                  "peer-checked:border-acc/30 peer-checked:bg-acc/10 peer-checked:text-acc",
                  "peer-hover:border-acc/20 peer-hover:text-foreground",
                  "peer-checked:peer-hover:text-acc",
                  "peer-disabled:cursor-not-allowed peer-disabled:opacity-40 peer-disabled:hover:border-border peer-disabled:hover:text-foreground-secondary",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-acc/40",
                )}
              >
                {tag}
              </span>
            </label>
          );
        })}
      </div>
    </Modal>
  );
}
