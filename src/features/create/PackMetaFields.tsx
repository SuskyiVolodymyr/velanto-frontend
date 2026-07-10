"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { COVER_TONES } from "@/src/shared/types/pack";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { TagPickerModal } from "@/src/shared/components/TagPickerModal";
import { TextField } from "@/src/shared/components/form/TextField";
import { TextareaField } from "@/src/shared/components/form/TextareaField";
import { cn } from "@/src/shared/lib/cn";
import { type CreatePackValues, MAX_TAGS } from "@/src/features/create/create-pack.schema";

/**
 * The "Basics" section: title, description, cover tone and tag picker. Reads and
 * writes the shared react-hook-form state through context, so it stays in sync
 * with the rest of the create form without prop drilling.
 */
export function PackMetaFields() {
  const { control, setValue, formState } = useFormContext<CreatePackValues>();
  const { isSubmitting } = formState;
  const tags = useWatch({ control, name: "tags" });
  const coverTone = useWatch({ control, name: "coverTone" });
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="title" className="text-lg">
        Basics
      </Text>
      <TextField
        name="title"
        label="Pack title"
        srOnlyLabel
        placeholder="Pack title"
        disabled={isSubmitting}
      />
      <TextareaField
        name="description"
        label="Pack description"
        srOnlyLabel
        placeholder="Short description"
        rows={2}
        disabled={isSubmitting}
      />
      <div className="flex flex-col gap-2">
        <Text variant="secondary" className="text-xs">
          Cover tone
        </Text>
        <div className="flex gap-2">
          {COVER_TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => setValue("coverTone", tone)}
              aria-label={`Cover tone ${tone}`}
              aria-pressed={coverTone === tone}
              style={{ background: tone }}
              className={cn(
                "h-9 w-9 rounded-[10px] border-2",
                coverTone === tone ? "border-acc" : "border-transparent",
              )}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Text variant="secondary" className="text-xs">
          Tags
        </Text>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setTagPickerOpen(true)}
          className="self-start"
        >
          {tags.length === 0
            ? "Select tags"
            : `${tags.length} tag${tags.length === 1 ? "" : "s"} selected`}
        </Button>
        <TagPickerModal
          open={tagPickerOpen}
          onClose={() => setTagPickerOpen(false)}
          selected={tags}
          onChange={(next) => setValue("tags", next)}
          maxTags={MAX_TAGS}
        />
      </div>
    </section>
  );
}
