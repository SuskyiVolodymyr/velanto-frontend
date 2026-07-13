"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Group, Item, ItemType } from "@/src/shared/types/pack";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";

/**
 * Owns the "add an item" draft state for a single {@link GroupEditor} — the
 * text/youtube toggle, the draft fields, in-flight oEmbed validation, and the
 * add-error message. Lifted out of the editor so the group-level controls can
 * share the `validating` flag (they disable while an add is in flight).
 */
export function useGroupItemDraft(
  group: Group,
  onChange: (group: Group) => void,
) {
  const [draftType, setDraftType] = useState<ItemType>("text");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [validating, setValidating] = useState(false);
  const [addError, setAddError] = useState("");
  const t = useTranslations("create");

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
      setAddError(t("notYoutubeLink"));
      return;
    }

    if (!draftTitle.trim()) {
      setAddError(t("linkTitleRequired"));
      return;
    }

    setValidating(true);
    try {
      // Confirm the video actually exists; the title is the creator's own,
      // required input (no oEmbed fallback).
      const result = await fetchYouTubeOEmbed(draftValue.trim());
      if (!result) {
        setAddError(t("videoNotFound"));
        return;
      }

      const item: Item = {
        id: crypto.randomUUID(),
        type: "youtube",
        title: draftTitle.trim(),
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
