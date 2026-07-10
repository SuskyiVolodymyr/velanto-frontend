"use client";

import { useTranslations } from "next-intl";
import type { ItemType } from "@/src/shared/types/pack";
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
  addError: string;
  onSelectType: (type: ItemType) => void;
  onDraftTitleChange: (value: string) => void;
  onDraftValueChange: (value: string) => void;
  onAdd: () => void;
}

/** The text/YouTube toggle plus the draft inputs for adding a new item. */
export function GroupItemAdder({
  index,
  draftType,
  draftTitle,
  draftValue,
  validating,
  addError,
  onSelectType,
  onDraftTitleChange,
  onDraftValueChange,
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
      </div>
      {draftType === "text" ? (
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
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Input
              value={draftTitle}
              onChange={(e) => onDraftTitleChange(e.target.value)}
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
          {addError && (
            <Text className="text-xs text-[#ff6b6b]">{addError}</Text>
          )}
        </div>
      )}
    </div>
  );
}
