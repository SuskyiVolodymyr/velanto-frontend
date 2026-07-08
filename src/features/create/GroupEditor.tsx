"use client";

import { useState } from "react";
import type { Group, Item, ItemType } from "@/src/shared/types/pack";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { cn } from "@/src/shared/lib/cn";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";

interface GroupEditorProps {
  group: Group;
  index: number;
  removable: boolean;
  onChange: (group: Group) => void;
  onRemove: () => void;
}

export function GroupEditor({ group, index, removable, onChange, onRemove }: GroupEditorProps) {
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
      onChange({ ...group, items: [...group.items, item] });
      setDraftTitle("");
      setDraftValue("");
      return;
    }

    const videoId = extractYouTubeId(draftValue.trim());
    if (!videoId) {
      setAddError("That doesn't look like a YouTube link.");
      return;
    }

    setValidating(true);
    try {
      const result = await fetchYouTubeOEmbed(draftValue.trim());
      if (!result) {
        setAddError("Couldn't find that video — check the link.");
        return;
      }

      const item: Item = {
        id: crypto.randomUUID(),
        type: "youtube",
        title: draftTitle.trim() || result.title || "Untitled",
        value: draftValue.trim(),
      };
      onChange({ ...group, items: [...group.items, item] });
      setDraftTitle("");
      setDraftValue("");
    } finally {
      setValidating(false);
    }
  }

  function removeItem(itemId: string) {
    onChange({ ...group, items: group.items.filter((item) => item.id !== itemId) });
  }

  return (
    <Card className="flex flex-col gap-3 hover:translate-y-0 hover:shadow-none">
      <div className="flex flex-wrap items-center gap-2.5">
        <Input
          value={group.name}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          placeholder={`Group ${index + 1} name`}
          aria-label={`Group ${index + 1} name`}
          className="flex-1 min-w-[140px] font-semibold"
        />
        <div className="flex rounded-[9px] border border-border bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => onChange({ ...group, selectionMode: "random" })}
            disabled={validating}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors",
              group.selectionMode === "random"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            Random
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...group, selectionMode: "manual", sampleSize: undefined })}
            disabled={validating}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors",
              group.selectionMode === "manual"
                ? "bg-white/[0.12] text-foreground"
                : "text-foreground-secondary",
            )}
          >
            Manual
          </button>
        </div>
        {group.selectionMode === "random" && (
          <Input
            type="number"
            min={1}
            value={group.sampleSize ?? ""}
            onChange={(e) =>
              onChange({
                ...group,
                sampleSize: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            disabled={validating}
            aria-label={`Group ${index + 1} sample size`}
            title="Items drawn per round"
            className="w-16 text-center"
          />
        )}
        {removable && (
          <Button variant="ghost" type="button" onClick={onRemove} aria-label={`Remove group ${index + 1}`}>
            Remove
          </Button>
        )}
      </div>

      {group.items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {group.items.map((item) => (
            <li
              key={item.id}
              className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-white/[0.04] px-2.5 py-1 text-sm text-foreground"
            >
              {item.title}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${item.title}`}
                className="text-foreground-tertiary hover:text-[#ff6b6b]"
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
              draftType === "text" ? "bg-white/[0.12] text-foreground" : "text-foreground-secondary",
            )}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftType("youtube");
              setAddError("");
            }}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-xs font-medium",
              draftType === "youtube" ? "bg-white/[0.12] text-foreground" : "text-foreground-secondary",
            )}
          >
            Link
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
              placeholder="Add an item…"
              aria-label={`Group ${index + 1} new item`}
              className="flex-1"
            />
            <Button type="button" onClick={() => void addItem()}>
              Add
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Title"
                aria-label={`Group ${index + 1} new item title`}
                className="flex-1 min-w-[100px]"
              />
              <Input
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addItem();
                }}
                disabled={validating}
                placeholder="YouTube link…"
                aria-label={`Group ${index + 1} new item link`}
                className="flex-[2] min-w-[140px]"
              />
              <Button type="button" onClick={() => void addItem()} disabled={validating}>
                {validating ? "Checking…" : "Add"}
              </Button>
            </div>
            {addError && <Text className="text-xs text-[#ff6b6b]">{addError}</Text>}
          </div>
        )}
      </div>

      <Text variant="tertiary" className="text-xs">
        {group.items.length} item{group.items.length === 1 ? "" : "s"}
      </Text>
    </Card>
  );
}
