"use client";

import { useTranslations } from "next-intl";
import type { ItemType } from "@/src/shared/types/pack";
import { ITEM_TITLE_MAX } from "@/src/features/create/create-pack.schema";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

interface GroupItemAdderProps {
  index: number;
  draftType: ItemType;
  draftTitle: string;
  draftValue: string;
  validating: boolean;
  uploading: boolean;
  imagePreviewUrl: string;
  addError: string;
  onSelectType: (type: ItemType) => void;
  onDraftTitleChange: (value: string) => void;
  onDraftValueChange: (value: string) => void;
  onSelectImage: (file: File | null) => void;
  onAdd: () => void;
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
  addError,
  onSelectType,
  onDraftTitleChange,
  onDraftValueChange,
  onSelectImage,
  onAdd,
}: GroupItemAdderProps) {
  const t = useTranslations("create");
  return (
    <div className="flex flex-col gap-2">
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
      {draftType === "text" && (
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
            {t("add")}
          </Button>
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
              {validating ? t("checking") : t("add")}
            </Button>
          </div>
          {addError && <Text className="text-xs text-danger">{addError}</Text>}
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
              {t("add")}
            </Button>
          </div>
          {imagePreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local upload preview (object/CDN URL); Next <Image> adds no value for a transient thumbnail
            <img
              src={imagePreviewUrl}
              alt=""
              className="h-24 w-24 rounded-lg border border-border object-cover"
            />
          )}
          {addError && <Text className="text-xs text-danger">{addError}</Text>}
        </div>
      )}
    </div>
  );
}
