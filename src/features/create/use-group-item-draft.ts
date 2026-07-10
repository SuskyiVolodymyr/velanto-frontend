"use client";

import { useState } from "react";
import type { Group, Item, ItemType } from "@/src/shared/types/pack";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";

/**
 * Owns the "add an item" draft state for a single {@link GroupEditor} — the
 * text/youtube toggle, the draft fields, in-flight oEmbed validation, and the
 * add-error message. Lifted out of the editor so the group-level controls can
 * share the `validating` flag (they disable while an add is in flight).
 */
export function useGroupItemDraft(group: Group, onChange: (group: Group) => void) {
  const [draftType, setDraftType] = useState<ItemType>("text");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [validating, setValidating] = useState(false);
  const [addError, setAddError] = useState("");

  function selectType(type: ItemType) {
    setDraftType(type);
    setAddError("");
  }

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

  return {
    draftType,
    draftTitle,
    draftValue,
    validating,
    addError,
    selectType,
    setDraftTitle,
    setDraftValue,
    addItem,
  };
}
