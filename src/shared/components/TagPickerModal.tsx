"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PACK_TAGS } from "@/src/shared/types/pack";
import type { PackTag } from "@/src/shared/types/pack";
import { Modal } from "@/src/shared/components/Modal";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

export interface TagPickerModalProps {
  open: boolean;
  onClose: () => void;
  selected: PackTag[];
  onChange: (tags: PackTag[]) => void;
  /** When set, unchecked chips disable once the draft reaches this cap. */
  maxTags?: number;
}

export function TagPickerModal({
  open,
  onClose,
  selected,
  onChange,
  maxTags,
}: TagPickerModalProps) {
  const t = useTranslations("tagPicker");
  return (
    <Modal open={open} onClose={onClose} title={t("title")}>
      {/* TagPickerBody is a child of Modal, which unmounts its children when
          closed — so the draft below is freshly seeded from the committed
          selection on every open and discarded on cancel/close. Selections
          are only committed to the parent when Apply is pressed. */}
      <TagPickerBody
        selected={selected}
        maxTags={maxTags}
        onApply={(tags) => {
          onChange(tags);
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}

function TagPickerBody({
  selected,
  maxTags,
  onApply,
  onCancel,
}: {
  selected: PackTag[];
  maxTags?: number;
  onApply: (tags: PackTag[]) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("tagPicker");
  const [draft, setDraft] = useState<PackTag[]>(selected);

  function toggle(tag: PackTag) {
    setDraft((current) =>
      current.includes(tag)
        ? current.filter((other) => other !== tag)
        : [...current, tag],
    );
  }

  const atCap = maxTags !== undefined && draft.length >= maxTags;

  return (
    <>
      <Text variant="tertiary" className="mb-3 text-xs">
        {maxTags !== undefined
          ? t("selectedOfMax", { count: draft.length, max: maxTags })
          : t("selected", { count: draft.length })}
      </Text>

      {/* Chip toggles, matching the pill styling used by the format/sort
          filters. Each pill wraps a visually-hidden real checkbox so multi-select
          semantics, keyboard focus and the disabled-at-cap state stay intact. */}
      <div className="flex flex-wrap gap-2">
        {PACK_TAGS.map((tag) => {
          const isSelected = draft.includes(tag);
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

      <div className="mt-6 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setDraft([])}
          disabled={draft.length === 0}
        >
          {t("clear")}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={() => onApply(draft)}>
            {t("apply")}
          </Button>
        </div>
      </div>
    </>
  );
}
