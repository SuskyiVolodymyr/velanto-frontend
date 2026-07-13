"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { COVER_TONES } from "@/src/shared/types/pack";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { TagPickerModal } from "@/src/shared/components/TagPickerModal";
import { TextField } from "@/src/shared/components/form/TextField";
import { TextareaField } from "@/src/shared/components/form/TextareaField";
import { cn } from "@/src/shared/lib/cn";
import {
  type CreatePackValues,
  MAX_TAGS,
  TITLE_MAX,
  DESCRIPTION_MAX,
} from "@/src/features/create/create-pack.schema";

/**
 * The "Basics" section: title, description, cover tone and tag picker. Reads and
 * writes the shared react-hook-form state through context, so it stays in sync
 * with the rest of the create form without prop drilling.
 */
export function PackMetaFields() {
  const t = useTranslations("create");
  const { control, setValue, formState } = useFormContext<CreatePackValues>();
  const { isSubmitting } = formState;
  const tags = useWatch({ control, name: "tags" });
  const coverTone = useWatch({ control, name: "coverTone" });
  const title = useWatch({ control, name: "title" }) ?? "";
  const description = useWatch({ control, name: "description" }) ?? "";
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="title" className="text-lg">
        {t("basicsHeading")}
      </Text>
      <div className="flex flex-col gap-1">
        <TextField
          name="title"
          label={t("packTitle")}
          srOnlyLabel
          placeholder={t("packTitle")}
          maxLength={TITLE_MAX}
          disabled={isSubmitting}
        />
        <Text
          variant="tertiary"
          className="self-end text-xs tabular-nums"
          aria-hidden
        >
          {title.length}/{TITLE_MAX}
        </Text>
      </div>
      <div className="flex flex-col gap-1">
        <TextareaField
          name="description"
          label={t("packDescription")}
          srOnlyLabel
          placeholder={t("descriptionPlaceholder")}
          rows={3}
          maxLength={DESCRIPTION_MAX}
          disabled={isSubmitting}
        />
        <Text
          variant="tertiary"
          className="self-end text-xs tabular-nums"
          aria-hidden
        >
          {description.length}/{DESCRIPTION_MAX}
        </Text>
      </div>
      <div className="flex flex-col gap-2">
        <Text variant="secondary" className="text-xs">
          {t("coverTone")}
        </Text>
        <div className="flex gap-2">
          {COVER_TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => setValue("coverTone", tone)}
              aria-label={t("coverToneSwatch", { tone })}
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
        <div className="flex items-center justify-between gap-2">
          <Text variant="secondary" className="text-xs">
            {t("tags")}
          </Text>
          <Text variant="tertiary" className="text-xs tabular-nums">
            {tags.length}/{MAX_TAGS}
          </Text>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setValue(
                    "tags",
                    tags.filter((value) => value !== tag),
                  )
                }
                aria-label={t("removeTag", { tag })}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.04] px-3 py-1 text-xs text-foreground transition-colors hover:border-border-strong"
              >
                {tag}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setTagPickerOpen(true)}
          className="self-start"
        >
          {tags.length === 0
            ? t("selectTags")
            : t("tagsSelected", { count: tags.length })}
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
