"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Category, Item, ItemType } from "@/src/shared/types/pack";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { cn } from "@/src/shared/lib/cn";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";

interface CategoryEditorProps {
  category: Category;
  index: number;
  onChange: (category: Category) => void;
  /** Validation error for this category, surfaced by the parent form on submit. */
  error?: string;
}

export function CategoryEditor({
  category,
  index,
  onChange,
  error,
}: CategoryEditorProps) {
  const t = useTranslations("create");
  const [draftType, setDraftType] = useState<ItemType>("text");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [validating, setValidating] = useState(false);
  const [addError, setAddError] = useState("");

  async function addItem() {
    if (!draftValue.trim() || validating) return;
    setAddError("");

    if (draftType === "text") {
      const item: Item = {
        id: crypto.randomUUID(),
        type: "text",
        title: draftValue.trim(),
        value: draftValue.trim(),
      };
      onChange({ ...category, items: [...category.items, item] });
      setDraftTitle("");
      setDraftValue("");
      return;
    }

    const videoId = extractYouTubeId(draftValue.trim());
    if (!videoId) {
      setAddError(t("notYoutubeLink"));
      return;
    }

    setValidating(true);
    try {
      const result = await fetchYouTubeOEmbed(draftValue.trim());
      if (!result) {
        setAddError(t("videoNotFound"));
        return;
      }

      const item: Item = {
        id: crypto.randomUUID(),
        type: "youtube",
        title: draftTitle.trim() || result.title || t("untitled"),
        value: draftValue.trim(),
      };
      onChange({ ...category, items: [...category.items, item] });
      setDraftTitle("");
      setDraftValue("");
    } finally {
      setValidating(false);
    }
  }

  function removeItem(itemId: string) {
    onChange({
      ...category,
      items: category.items.filter((item) => item.id !== itemId),
    });
  }

  return (
    <Card className="flex flex-col gap-3 hover:translate-y-0 hover:shadow-none">
      <Input
        value={category.name}
        onChange={(e) => onChange({ ...category, name: e.target.value })}
        placeholder={t("categoryName", { index: index + 1 })}
        aria-label={t("categoryName", { index: index + 1 })}
        className="font-semibold"
      />

      {category.items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {category.items.map((item) => (
            <li
              key={item.id}
              className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-white/[0.04] px-2.5 py-1 text-sm text-foreground"
            >
              {item.title}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={t("removeItemAria", { title: item.title })}
                className="text-foreground-tertiary hover:text-danger"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex w-fit rounded-[9px] border border-border bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => {
              setDraftType("text");
              setAddError("");
            }}
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
            onClick={() => {
              setDraftType("youtube");
              setAddError("");
            }}
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
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addItem();
              }}
              placeholder={t("addItemPlaceholder")}
              aria-label={t("categoryNewItem", { index: index + 1 })}
              className="flex-1"
            />
            <Button type="button" onClick={() => void addItem()}>
              {t("add")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder={t("itemTitlePlaceholder")}
                aria-label={t("categoryNewItemTitle", { index: index + 1 })}
                className="flex-1 min-w-[100px]"
              />
              <Input
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addItem();
                }}
                disabled={validating}
                placeholder={t("youtubeLinkPlaceholder")}
                aria-label={t("categoryNewItemLink", { index: index + 1 })}
                className="flex-[2] min-w-[140px]"
              />
              <Button
                type="button"
                onClick={() => void addItem()}
                disabled={validating}
              >
                {validating ? t("checking") : t("add")}
              </Button>
            </div>
            {addError && (
              <Text className="text-xs text-danger">{addError}</Text>
            )}
          </div>
        )}
      </div>

      <Text variant="tertiary" className="text-xs">
        {t("itemCount", { count: category.items.length })}
      </Text>

      {error && (
        <Text role="alert" className="text-sm text-danger">
          {error}
        </Text>
      )}
    </Card>
  );
}
