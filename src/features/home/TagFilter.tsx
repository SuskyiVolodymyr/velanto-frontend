"use client";

import { useState } from "react";
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

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        {tags.length === 0
          ? "Filter by tags"
          : `${tags.length} tag${tags.length === 1 ? "" : "s"}`}
      </Button>

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Active tag filters">
          {tags.map((tag) => (
            <li key={tag}>
              {/* Removing an active filter chip applies immediately, matching
                  the usual "active filters" affordance — the Apply flow is for
                  bulk editing inside the modal. */}
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                aria-label={`Remove ${tag} filter`}
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
