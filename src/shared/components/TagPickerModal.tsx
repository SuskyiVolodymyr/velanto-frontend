"use client";

import { PACK_TAGS } from "@/src/shared/types/pack";
import type { PackTag } from "@/src/shared/types/pack";
import { Modal } from "@/src/shared/components/Modal";
import { Text } from "@/src/shared/components/Text";

export interface TagPickerModalProps {
  open: boolean;
  onClose: () => void;
  selected: PackTag[];
  onChange: (tags: PackTag[]) => void;
  /** When set, unchecked boxes disable once `selected.length` reaches this cap. */
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
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {PACK_TAGS.map((tag) => {
          const isSelected = selected.includes(tag);
          const disabled = !isSelected && atCap;
          return (
            <label
              key={tag}
              className="flex items-center gap-2 text-sm text-foreground-secondary"
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => toggle(tag)}
                className="h-4 w-4 rounded border-border accent-acc"
              />
              {tag}
            </label>
          );
        })}
      </div>
    </Modal>
  );
}
