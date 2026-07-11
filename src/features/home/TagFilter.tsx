"use client";

import { useState } from "react";
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
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-4 w-4 text-foreground-secondary"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59A2 2 0 0 0 3.59 11l9.59 9.59a2 2 0 0 0 2.82 0l4.59-4.59a2 2 0 0 0 0-2.82Z" />
              <circle
                cx="7.5"
                cy="7.5"
                r="1.3"
                fill="currentColor"
                stroke="none"
              />
            </svg>
            {tags.length === 0
              ? t("filterByTags")
              : t("tagCount", { count: tags.length })}
          </span>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-4 w-4 text-foreground-secondary"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
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
