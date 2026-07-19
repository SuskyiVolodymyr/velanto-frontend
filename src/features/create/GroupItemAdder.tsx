"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ItemType } from "@/src/shared/types/pack";
import { ITEM_TITLE_MAX } from "@/src/features/create/create-pack.schema";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { ItemImageCropModal } from "@/src/features/create/ItemImageCropModal";

interface GroupItemAdderProps {
  index: number;
  draftType: ItemType;
  draftTitle: string;
  draftValue: string;
  validating: boolean;
  uploading: boolean;
  imagePreviewUrl: string;
  /** The source file behind the preview, for the optional 16:9 crop. */
  imageFile: File | null;
  addError: string;
  onSelectType: (type: ItemType) => void;
  onDraftTitleChange: (value: string) => void;
  onDraftValueChange: (value: string) => void;
  onSelectImage: (file: File | null) => void;
  onApplyCrop: (cropped: File) => void;
  onAdd: () => void;
  /** Set when an existing item is lifted in for editing (Add becomes Save). */
  editing?: boolean;
  onCancelEdit?: () => void;
}

/** The text/YouTube/image toggle plus the draft inputs for adding a new item. */
export function GroupItemAdder({
  index,
  draftType,
  draftTitle,
  draftValue,
  validating,
  uploading,
  imagePreviewUrl,
  imageFile,
  addError,
  onSelectType,
  onDraftTitleChange,
  onDraftValueChange,
  onSelectImage,
  onApplyCrop,
  onAdd,
  editing = false,
  onCancelEdit,
}: GroupItemAdderProps) {
  const t = useTranslations("create");
  const [cropOpen, setCropOpen] = useState(false);
  // Same control, different promise: Add appends, Save replaces the item the
  // author clicked. Labelling both "Add" would read as creating a duplicate.
  const commitLabel = editing ? t("saveItem") : t("add");
  return (
    <div
      className="flex flex-col gap-2"
      // Escape backs out of an edit from anywhere in the row — the author's
      // hands are already on the keyboard, and the alternative is hunting for
      // Cancel. Harmless when not editing.
      onKeyDown={(e) => {
        if (e.key === "Escape" && editing && onCancelEdit) {
          e.stopPropagation();
          onCancelEdit();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-fit rounded-[9px] border border-border bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => onSelectType("text")}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium",
              draftType === "text"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            {t("text")}
          </button>
          <button
            type="button"
            onClick={() => onSelectType("youtube")}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium",
              draftType === "youtube"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            {t("link")}
          </button>
          <button
            type="button"
            onClick={() => onSelectType("image")}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium",
              draftType === "image"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            {t("image")}
          </button>
        </div>
        {editing && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs font-medium text-foreground-tertiary hover:text-foreground"
          >
            {t("cancelEdit")}
          </button>
        )}
      </div>
      {draftType === "text" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={draftValue}
              onChange={(e) => onDraftValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAdd();
              }}
              placeholder={t("addItemPlaceholder")}
              aria-label={t("groupNewItem", { index: index + 1 })}
              className="flex-1"
            />
            <Button type="button" onClick={() => onAdd()}>
              {commitLabel}
            </Button>
          </div>
          {/* The text branch had no error slot at all — an empty Add was simply
              a no-op, which was fine when the only outcome was "nothing added",
              but silently swallowed the "you emptied an existing item" case. */}
          {addError && (
            <Text variant="danger" className="text-xs">
              {addError}
            </Text>
          )}
        </div>
      )}
      {draftType === "youtube" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Input
              value={draftTitle}
              onChange={(e) => onDraftTitleChange(e.target.value)}
              maxLength={ITEM_TITLE_MAX}
              placeholder={t("itemTitlePlaceholder")}
              aria-label={t("groupNewItemTitle", { index: index + 1 })}
              className="flex-1 min-w-[100px]"
            />
            <Input
              value={draftValue}
              onChange={(e) => onDraftValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAdd();
              }}
              disabled={validating}
              placeholder={t("youtubeLinkPlaceholder")}
              aria-label={t("groupNewItemLink", { index: index + 1 })}
              className="flex-[2] min-w-[140px]"
            />
            <Button type="button" onClick={() => onAdd()} disabled={validating}>
              {validating ? t("checking") : commitLabel}
            </Button>
          </div>
          {addError && (
            <Text variant="danger" className="text-xs">
              {addError}
            </Text>
          )}
        </div>
      )}
      {draftType === "image" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={draftTitle}
              onChange={(e) => onDraftTitleChange(e.target.value)}
              maxLength={ITEM_TITLE_MAX}
              placeholder={t("itemTitlePlaceholder")}
              aria-label={t("groupNewItemTitle", { index: index + 1 })}
              className="flex-1 min-w-[100px]"
            />
            <label
              className={cn(
                "cursor-pointer rounded-[9px] border border-border bg-white/[0.03] px-3 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground",
                uploading && "pointer-events-none opacity-60",
              )}
            >
              {uploading ? t("uploading") : t("chooseImage")}
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                aria-label={t("groupNewItemImage", { index: index + 1 })}
                onChange={(e) => {
                  onSelectImage(e.target.files?.[0] ?? null);
                  // Clear the value so re-selecting the SAME file after a failed
                  // upload still fires onChange (the value would be unchanged).
                  e.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            <Button type="button" onClick={() => onAdd()} disabled={uploading}>
              {commitLabel}
            </Button>
          </div>
          {imagePreviewUrl && (
            <div className="flex flex-col items-start gap-1.5">
              {/* Preview at the SAME 16:9 the round crops to, so the author sees
                  exactly how it will be framed in play (no square-vs-16:9
                  surprise). */}
              <div className="relative aspect-video w-44 overflow-hidden rounded-lg border border-border bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element -- local upload preview (object/CDN URL); Next <Image> adds no value for a transient thumbnail */}
                <img
                  src={imagePreviewUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => setCropOpen(true)}
                  disabled={uploading}
                  className="text-xs font-medium text-acc hover:underline disabled:opacity-60"
                >
                  {t("adjustImageCrop")}
                </button>
              )}
            </div>
          )}
          {addError && (
            <Text variant="danger" className="text-xs">
              {addError}
            </Text>
          )}
          {cropOpen && imageFile && (
            <ItemImageCropModal
              file={imageFile}
              open
              onCancel={() => setCropOpen(false)}
              onCropped={(cropped) => {
                setCropOpen(false);
                onApplyCrop(cropped);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
