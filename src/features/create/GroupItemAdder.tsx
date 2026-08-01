"use client";

import { useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import type { ItemType } from "@/src/shared/types/pack";
import { ITEM_TITLE_MAX } from "@/src/features/create/create-pack.schema";
import { Input } from "@/src/shared/components/Input";
import { Text } from "@/src/shared/components/Text";
import { SegmentedControl } from "@/src/shared/components/SegmentedControl";
import { cn } from "@/src/shared/lib/cn";
import { ItemImageCropModal } from "@/src/features/create/ItemImageCropModal";

const fieldCaptionClassName =
  "text-[11.5px] font-semibold text-foreground-tertiary";

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
  /**
   * Collapses this panel back to the dashed "+ Add item" trigger, discarding
   * whatever's typed — present whenever the panel is expanded (T5), for both
   * the "new" and "editing" cases, not just editing.
   */
  onCancelEdit?: () => void;
  /** Editing only: deletes the item being edited outright. */
  onDelete?: () => void;
}

/**
 * The item-type toggle plus labeled draft fields, matching the mock's nested
 * cyan-bordered sub-panel (same treatment as the round editor's expanded
 * panel) — a footer row with the preview note on the left and Cancel/Save
 * (plus a Delete icon button while editing) on the right.
 */
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
  onDelete,
}: GroupItemAdderProps) {
  const t = useTranslations("create");
  const [cropOpen, setCropOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Nested children (icon, label) fire their own dragenter/dragleave as the
  // pointer crosses them, which would otherwise flicker `dragOver` off
  // mid-hover — a depth counter only clears it once every nested enter has
  // been balanced by a leave (same technique as CoverImageField).
  const dragDepth = useRef(0);
  // Same control, different promise: Add appends, Save replaces the item the
  // author clicked. Labelling both "Add" would read as creating a duplicate.
  const commitLabel = editing ? t("saveItem") : t("add");
  const hint =
    draftType === "text"
      ? t("itemHintText")
      : draftType === "youtube"
        ? t("itemHintVideo")
        : t("itemHintImage");
  const previewNote =
    draftType === "text"
      ? t("previewNoteText")
      : draftType === "youtube"
        ? t("previewNoteVideo")
        : t("previewNoteImage");

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    if (uploading) return;
    dragDepth.current += 1;
    setDragOver(true);
  }
  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }
  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    if (uploading) return;
    onSelectImage(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div
      className="flex flex-col gap-[13px] rounded-[14px] border border-acc/35 bg-[#0F1116] p-[14px]"
      // Escape backs out of this panel from anywhere in the row — the
      // author's hands are already on the keyboard, and the alternative is
      // hunting for Cancel. Collapses the "new" add panel just as readily as
      // an in-progress edit (T5) — onCancelEdit is passed whenever this panel
      // is expanded at all, not only while editing.
      //
      // `cropOpen` guards this: ItemImageCropModal renders inline in this
      // same subtree (Modal.tsx isn't a portal), so an Escape aimed at
      // dismissing the crop dialog would otherwise bubble here and collapse
      // the WHOLE panel underneath it — discarding a typed title and an
      // already-uploaded image key the author never asked to lose. While the
      // cropper is open, Escape is its own concern (ItemImageCropModal's
      // onCancel), not this row's.
      onKeyDown={(e) => {
        if (e.key === "Escape" && onCancelEdit && !cropOpen) {
          e.stopPropagation();
          onCancelEdit();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-[11px]">
        <span className={fieldCaptionClassName}>
          {editing ? t("itemTypeLabel") : t("newItemLabel")}
        </span>
        <SegmentedControl<ItemType>
          value={draftType}
          onChange={onSelectType}
          options={[
            {
              value: "text",
              label: t("text"),
              ariaLabel: t("itemTypeText", { index: index + 1 }),
            },
            {
              // Display label only — the underlying value/i18n key stay
              // "youtube"/itemTypeLink (T5: the mock reads "YouTube" here,
              // was "Link").
              value: "youtube",
              label: t("link"),
              ariaLabel: t("itemTypeLink", { index: index + 1 }),
            },
            {
              value: "image",
              label: t("image"),
              ariaLabel: t("itemTypeImage", { index: index + 1 }),
            },
          ]}
        />
        <Text variant="tertiary" className="ms-auto text-[11.5px]">
          {hint}
        </Text>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {draftType === "image" && (
          <div className="flex flex-none flex-col gap-[7px]">
            <span className={fieldCaptionClassName}>{t("itemImageLabel")}</span>
            <label
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={cn(
                "relative flex h-10 cursor-pointer items-center gap-[9px] overflow-hidden rounded-[11px] border border-dashed px-[14px] text-[12.5px] font-semibold transition-colors",
                uploading && "pointer-events-none opacity-60",
              )}
              style={
                imagePreviewUrl
                  ? { borderColor: "rgba(255,255,255,.14)" }
                  : dragOver
                    ? {
                        borderColor: "#00e5ff",
                        backgroundColor: "rgba(0,229,255,.12)",
                        color: "#8cf3ff",
                      }
                    : {
                        borderColor: "rgba(255,255,255,.16)",
                        color: "rgba(238,241,246,.55)",
                      }
              }
            >
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                aria-label={t("groupNewItemImage", { index: index + 1 })}
                onChange={(e) => {
                  onSelectImage(e.target.files?.[0] ?? null);
                  // Clear the value so re-selecting the SAME file after a
                  // failed upload still fires onChange (the value would be
                  // unchanged).
                  e.target.value = "";
                }}
                className="sr-only"
              />
              <svg
                aria-hidden
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-none"
              >
                <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                <path d="M12 3v13M7.5 7.5L12 3l4.5 4.5" />
              </svg>
              <span className="truncate">
                {uploading
                  ? t("uploading")
                  : dragOver
                    ? t("coverDropToUpload")
                    : imagePreviewUrl
                      ? t("replaceImage")
                      : t("itemImageDragHint")}
              </span>
            </label>
            {imagePreviewUrl && (
              <div className="flex flex-col items-start gap-1.5">
                {/* Preview at the SAME 16:9 the round crops to, so the author
                    sees exactly how it will be framed in play (no
                    square-vs-16:9 surprise). */}
                <div className="relative aspect-video w-32 overflow-hidden rounded-lg border border-border bg-black">
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
          </div>
        )}

        <div className="flex min-w-[200px] flex-1 flex-col gap-[7px]">
          <span className={fieldCaptionClassName}>
            {draftType === "text"
              ? t("itemTextOnCardLabel")
              : t("itemNameLabel")}
          </span>
          {draftType === "text" ? (
            <Input
              value={draftValue}
              onChange={(e) => onDraftValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAdd();
              }}
              placeholder={t("addItemPlaceholder")}
              aria-label={t("groupNewItem", { index: index + 1 })}
            />
          ) : (
            <Input
              value={draftTitle}
              onChange={(e) => onDraftTitleChange(e.target.value)}
              maxLength={ITEM_TITLE_MAX}
              placeholder={t("itemTitlePlaceholder")}
              aria-label={t("groupNewItemTitle", { index: index + 1 })}
            />
          )}
        </div>

        {draftType === "youtube" && (
          <div className="flex w-[230px] flex-none flex-col gap-[7px]">
            <span className={fieldCaptionClassName}>
              {t("youtubeLinkLabel")}
            </span>
            <Input
              value={draftValue}
              onChange={(e) => onDraftValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAdd();
              }}
              disabled={validating}
              placeholder={t("youtubeLinkPlaceholder")}
              aria-label={t("groupNewItemLink", { index: index + 1 })}
            />
          </div>
        )}
      </div>

      {addError && (
        <Text variant="danger" role="alert" className="text-xs">
          {addError}
        </Text>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Text variant="tertiary" className="text-[11.5px]">
          {previewNote}
        </Text>
        <div className="ms-auto flex items-center gap-2">
          {editing && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={t("remove")}
              className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] border border-danger/30 bg-danger/10 text-[#ff8c8c] transition-colors hover:bg-danger/[0.18]"
            >
              <svg
                aria-hidden
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13" />
              </svg>
            </button>
          )}
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="h-10 rounded-[11px] border border-white/[0.14] px-[14px] text-[13px] font-semibold text-foreground transition-colors hover:bg-white/[0.06]"
            >
              {t("cancelEdit")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onAdd()}
            disabled={validating || uploading}
            className="h-10 rounded-[11px] bg-acc px-4 text-[13px] font-bold text-[#07131a] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {validating ? t("checking") : commitLabel}
          </button>
        </div>
      </div>

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
  );
}
