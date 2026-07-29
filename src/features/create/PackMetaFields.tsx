"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { COVER_TONES } from "@/src/shared/types/pack";
import {
  PACK_LANGUAGES,
  PACK_LANGUAGE_NAMES,
} from "@/src/shared/types/pack-language";
import { Text } from "@/src/shared/components/Text";
import { TagPickerModal } from "@/src/shared/components/TagPickerModal";
import { TextField } from "@/src/shared/components/form/TextField";
import { TextareaField } from "@/src/shared/components/form/TextareaField";
import { SelectField } from "@/src/shared/components/form/SelectField";
import { CoverImageField } from "@/src/features/create/CoverImageField";
import { SwatchPicker } from "@/src/shared/components/SwatchPicker";
import { StepHeader } from "@/src/features/create/StepHeader";
import {
  type CreatePackValues,
  MAX_TAGS,
  TITLE_MAX,
  DESCRIPTION_MAX,
} from "@/src/features/create/create-pack.schema";

/**
 * The "Basics" section: title, description, cover tone, cover image, pack
 * language and the tag picker. Reads and writes the shared react-hook-form
 * state through context, so it stays in sync with the rest of the create form
 * without prop drilling.
 */
export function PackMetaFields({
  onCoverUploadingChange,
}: {
  onCoverUploadingChange?: (uploading: boolean) => void;
}) {
  const t = useTranslations("create");
  const { control, setValue, formState } = useFormContext<CreatePackValues>();
  const { isSubmitting } = formState;
  const tags = useWatch({ control, name: "tags" });
  const coverTone = useWatch({ control, name: "coverTone" });
  const title = useWatch({ control, name: "title" }) ?? "";
  const description = useWatch({ control, name: "description" }) ?? "";
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  return (
    <section className="flex flex-col">
      <StepHeader title={t("basicsHeading")} />
      <div className="flex flex-col gap-[14px] rounded-card border border-border bg-surface-card p-[18px]">
        <div className="flex flex-col gap-[7px]">
          <div className="flex items-center gap-2">
            <label
              htmlFor="title"
              className="text-[12.5px] font-medium text-foreground-secondary"
            >
              {t("packTitle")}
            </label>
            <Text
              variant="tertiary"
              className="ms-auto text-xs tabular-nums"
              aria-hidden
            >
              {title.length}/{TITLE_MAX}
            </Text>
          </div>
          <TextField
            name="title"
            label={t("packTitle")}
            srOnlyLabel
            placeholder={t("titlePlaceholder")}
            maxLength={TITLE_MAX}
            disabled={isSubmitting}
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <div className="flex items-center gap-2">
            <label
              htmlFor="description"
              className="text-[12.5px] font-medium text-foreground-secondary"
            >
              {t("packDescription")}
            </label>
            <Text
              variant="tertiary"
              className="ms-auto text-xs tabular-nums"
              aria-hidden
            >
              {description.length}/{DESCRIPTION_MAX}
            </Text>
          </div>
          <TextareaField
            name="description"
            label={t("packDescription")}
            srOnlyLabel
            placeholder={t("descriptionPlaceholder")}
            rows={2}
            maxLength={DESCRIPTION_MAX}
            disabled={isSubmitting}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Text
            variant="secondary"
            className="mb-[7px] text-[12.5px] font-medium"
          >
            {t("coverTone")}
          </Text>
          <SwatchPicker
            swatches={COVER_TONES}
            value={coverTone}
            onChange={(tone) => setValue("coverTone", tone)}
            getLabel={(tone) => t("coverToneSwatch", { tone })}
            swatchStyle="gradient"
          />
        </div>
        {/*
          Mock: Tags (flex:1) and Cover (fixed ~210px) sit side by side in one
          row — not two independent full-width blocks.
        */}
        <div className="flex flex-wrap gap-[14px]">
          <div className="flex min-w-[180px] flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Text variant="secondary" className="text-[12.5px] font-medium">
                {t("tags")}
              </Text>
              <Text variant="tertiary" className="ms-auto text-xs tabular-nums">
                {t("tagsCount", { count: tags.length, max: MAX_TAGS })}
              </Text>
            </div>
            <div className="flex min-h-11 flex-wrap items-center gap-[7px] rounded-[12px] border border-white/10 bg-[#0F1116] px-[10px] py-[7px]">
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
                  className="inline-flex h-7 items-center gap-[6px] rounded-pill bg-white/[0.07] ps-[11px] pe-[6px] text-xs font-semibold text-foreground/80 transition-colors hover:bg-white/[0.12]"
                >
                  {tag}
                  <span
                    aria-hidden
                    className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full bg-white/[0.1] text-[11px]"
                  >
                    ×
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTagPickerOpen(true)}
                className="inline-flex h-7 items-center gap-1 rounded-pill border border-dashed border-white/[0.14] px-[11px] text-xs font-semibold text-foreground-secondary transition-colors hover:border-acc hover:text-acc"
              >
                {t("addTags")}
              </button>
            </div>
          </div>
          <div className="w-[210px] flex-none">
            <CoverImageField onUploadingChange={onCoverUploadingChange} />
          </div>
        </div>
        {/*
          The pack CONTENT's language — what the pack is written in, not what the
          UI is in. Offers all 11 PACK_LANGUAGES, which is a deliberate superset
          of the 8 interface LOCALES: es/fr/pt have no catalog and can ONLY be
          reached here, because a pack's content language carries no GDPR
          targeting signal while the interface's does (see pack-language.ts).
        */}
        <div className="flex flex-col gap-1">
          <SelectField
            name="language"
            label={t("languageLabel")}
            aria-describedby="pack-language-hint"
            options={PACK_LANGUAGES.map((code) => ({
              value: code,
              label: PACK_LANGUAGE_NAMES[code],
            }))}
          />
          <Text id="pack-language-hint" variant="tertiary" className="text-xs">
            {t("languageHint")}
          </Text>
        </div>
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
