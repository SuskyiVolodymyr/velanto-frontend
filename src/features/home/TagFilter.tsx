"use client";

import { useState } from "react";
import { Button } from "@/src/shared/components/Button";
import { TagPickerModal } from "@/src/shared/components/TagPickerModal";
import type { PackTag } from "@/src/shared/types/pack";

// Tag filter trigger + picker modal. Owns only the modal's open/closed UI
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
    <>
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
      <TagPickerModal
        open={open}
        onClose={() => setOpen(false)}
        selected={tags}
        onChange={onChange}
      />
    </>
  );
}
