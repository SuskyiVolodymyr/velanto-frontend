"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Group, Item, ItemType } from "@/src/shared/types/pack";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";
import { uploadMedia, MEDIA_MAX_BYTES } from "@/src/shared/lib/media-client";

/**
 * Owns the "add an item" draft state for a single {@link GroupEditor} — the
 * text/youtube/image toggle, the draft fields, in-flight oEmbed/upload
 * validation, and the add-error message. Lifted out of the editor so the
 * group-level controls can share the busy flags (they disable while an add is in
 * flight).
 *
 * For an image item the file is uploaded to the media endpoint the moment it's
 * picked (client-validated as an image ≤1MB first); the returned storage KEY is
 * staged in `draftValue` and its URL in `imagePreviewUrl`, then committed as the
 * item value when Add is pressed.
 */
export function useGroupItemDraft(
  group: Group,
  onChange: (group: Group) => void,
) {
  const [draftType, setDraftType] = useState<ItemType>("text");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [addError, setAddError] = useState("");
  const t = useTranslations("create");

  function selectType(type: ItemType) {
    setDraftType(type);
    setAddError("");
    // Switching item type discards any staged draft value/preview so a youtube
    // URL never leaks into an image item (or a staged image key into a text one).
    setDraftValue("");
    setImagePreviewUrl("");
  }

  function pushItem(fields: Omit<Item, "id">) {
    const item: Item = { id: crypto.randomUUID(), ...fields };
    onChange({ ...group, items: [...group.items, item] });
    setDraftTitle("");
    setDraftValue("");
    setImagePreviewUrl("");
  }

  async function selectImageFile(file: File | null) {
    if (!file || uploading) return;
    setAddError("");
    setImagePreviewUrl("");
    setDraftValue("");
    if (!file.type.startsWith("image/")) {
      setAddError(t("notAnImage"));
      return;
    }
    if (file.size > MEDIA_MAX_BYTES) {
      setAddError(t("imageTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const { key, url } = await uploadMedia(file, "item");
      setDraftValue(key);
      setImagePreviewUrl(url);
    } catch {
      setAddError(t("imageUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function addItem() {
    if (validating || uploading) return;
    setAddError("");

    if (draftType === "image") {
      if (!draftValue) {
        setAddError(t("imageRequired"));
        return;
      }
      if (!draftTitle.trim()) {
        setAddError(t("imageTitleRequired"));
        return;
      }
      pushItem({ type: "image", title: draftTitle.trim(), value: draftValue });
      return;
    }

    if (!draftValue.trim()) return;

    if (draftType === "text") {
      pushItem({
        type: "text",
        title: draftValue.trim(),
        value: draftValue.trim(),
      });
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

      pushItem({
        type: "youtube",
        title: draftTitle.trim(),
        value: draftValue.trim(),
      });
    } finally {
      setValidating(false);
    }
  }

  return {
    draftType,
    draftTitle,
    draftValue,
    validating,
    uploading,
    imagePreviewUrl,
    addError,
    selectType,
    setDraftTitle,
    setDraftValue,
    selectImageFile,
    addItem,
  };
}
