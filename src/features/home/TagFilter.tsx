"use client";

import { useState } from "react";
import { Tag, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/src/shared/components/Button";
import { TagPickerModal } from "@/src/shared/components/TagPickerModal";
import type { PackTag } from "@/src/shared/types/pack";

// Tag filter trigger + picker modal, with the currently-active tags shown as
// removable chips beneath the button. Owns only the modal's open/closed UI
// state; the selected tags are lifted to the feed so they drive the fetch.
export function TagFilter({
  tags,
  onChange,
}: {
  tags: PackTag[];
  onChange: (tags: PackTag[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("home");

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Tag
              aria-hidden
              className="h-4 w-4 text-foreground-secondary"
              strokeWidth={1.8}
            />
            {tags.length === 0
              ? t("filterByTags")
              : t("tagCount", { count: tags.length })}
          </span>
          <ChevronDown
            aria-hidden
            className="h-4 w-4 text-foreground-secondary"
            strokeWidth={1.8}
          />
        </span>
      </Button>

      {tags.length > 0 && (
        <ul
          className="flex flex-wrap gap-1.5"
          aria-label={t("activeTagFilters")}
        >
          {tags.map((tag) => (
            <li key={tag}>
              {/* Removing an active filter chip applies immediately, matching
                  the usual "active filters" affordance — the Apply flow is for
                  bulk editing inside the modal. */}
              <button
                type="button"
                onClick={() => onChange(tags.filter((other) => other !== tag))}
                aria-label={t("removeTagFilter", { tag })}
                className="inline-flex items-center gap-1 rounded-[8px] border border-acc/30 bg-acc/10 px-2 py-0.5 text-xs font-medium text-acc transition-colors hover:bg-acc/20"
              >
                {tag}
                <span aria-hidden className="text-acc/70">
                  ✕
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <TagPickerModal
        open={open}
        onClose={() => setOpen(false)}
        selected={tags}
        onChange={onChange}
      />
    </div>
  );
}
