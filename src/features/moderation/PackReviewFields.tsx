"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import {
  MarkForEditButton,
  MarkRequestField,
} from "@/src/features/moderation/MarkForEdit";
import type { PackMarks } from "@/src/features/moderation/use-pack-marks";
import type { ChangeRequestMarkKind, Pack } from "@/src/shared/types/pack";

/**
 * The pack's own text — title, description, cover, tags — each markable for
 * rewriting.
 *
 * These are the parts of a pack that never appear in the item grid, and they
 * are also the ones most reviews are actually about: a fine set of items under
 * a misleading title. Without this card a moderator could only reject the pack
 * or approve a title they didn't want.
 *
 * The four kinds are single-valued, so a mark on them carries no id (the
 * backend rejects one) — `MarkTarget.id` is left undefined here on purpose.
 */
export function PackReviewFields({
  pack,
  marks,
}: {
  pack: Pack;
  marks: PackMarks;
}) {
  const t = useTranslations("moderation");

  const fields: {
    kind: ChangeRequestMarkKind;
    label: string;
    value: string;
    empty?: boolean;
  }[] = [
    { kind: "title", label: t("fieldTitle"), value: pack.title },
    {
      kind: "description",
      label: t("fieldDescription"),
      value: pack.description || t("fieldEmpty"),
      empty: !pack.description,
    },
    {
      kind: "cover",
      label: t("fieldCover"),
      value: pack.coverImageKey
        ? t("fieldCoverUploaded")
        : t("fieldCoverTone", { tone: pack.coverTone }),
    },
    {
      kind: "tags",
      label: t("fieldTags"),
      value: pack.tags.length > 0 ? pack.tags.join(", ") : t("fieldEmpty"),
      empty: pack.tags.length === 0,
    },
  ];

  return (
    <section className="flex flex-col gap-2.5 rounded-[16px] border border-border bg-surface-card px-[18px] py-4">
      <Text as="h2" className="text-[13px] font-bold">
        {t("fieldsHeading")}
      </Text>
      {fields.map((field) => (
        <div
          key={field.kind}
          className="flex flex-col gap-2 rounded-control border border-border bg-background px-3 py-3"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <Text
              variant="tertiary"
              className="flex-none text-[10.5px] font-bold uppercase tracking-[0.08em]"
            >
              {field.label}
            </Text>
            <Text
              variant={field.empty ? "tertiary" : "body"}
              className="min-w-0 text-[13px] font-semibold"
            >
              {field.value}
            </Text>
            <MarkForEditButton
              marks={marks}
              target={{ kind: field.kind, label: field.label }}
              className="ms-auto"
            />
          </div>
          <MarkRequestField
            marks={marks}
            target={{ kind: field.kind, label: field.label }}
            placeholder={t("markFieldPlaceholder")}
          />
        </div>
      ))}
    </section>
  );
}
