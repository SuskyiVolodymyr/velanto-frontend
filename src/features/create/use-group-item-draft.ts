"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Group, Item, ItemType } from "@/src/shared/types/pack";
import { extractYouTubeId } from "@/src/shared/lib/youtube";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";
import { uploadMedia, MEDIA_MAX_BYTES } from "@/src/shared/lib/media-client";
import { mediaUrl } from "@/src/shared/lib/media-url";

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
  // The original picked file, kept after upload so the author can re-open the
  // 16:9 cropper and re-frame it (always cropping from the source, never a
  // previous crop). Null when there's no staged image.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [addError, setAddError] = useState("");
  // Id of the already-added item being edited, or null when composing a new one.
  // The item deliberately STAYS in `group.items` while it's edited — the chip is
  // only hidden — so abandoning the edit (switching to another chip, or just
  // submitting the form) leaves the original intact instead of dropping it.
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const t = useTranslations("create");
  // Monotonic token, bumped whenever the draft type changes or a new image is
  // picked. A slow upload that resolves after the user has moved on is compared
  // against the current token and discarded, so its storage key never leaks
  // into an unrelated (text/youtube) draft value.
  const uploadToken = useRef(0);

  function selectType(type: ItemType) {
    if (type === draftType) return;
    uploadToken.current += 1;
    setAddError("");

    // Carry whatever the author has typed across the switch, so changing your
    // mind about the format doesn't throw the words away. A text item has no
    // separate title (title === value), so its body IS the title of a titled
    // type, and vice versa. The staged VALUE never carries — a youtube URL must
    // not leak into an image item, nor a staged image key into a text one.
    if (draftType === "text") {
      // text -> titled: the body becomes the title, unless a title was already
      // set deliberately (someone touring the format buttons keeps theirs).
      if (draftValue.trim() && !draftTitle.trim()) setDraftTitle(draftValue);
      setDraftValue("");
    } else if (type === "text") {
      // titled -> text: the title becomes the body.
      setDraftValue(draftTitle);
      setDraftTitle("");
    } else {
      // image <-> youtube: both are titled, so only the value is dropped.
      setDraftValue("");
    }

    setDraftType(type);
    setImagePreviewUrl("");
    setImageFile(null);
  }

  function resetDraft() {
    setDraftTitle("");
    setDraftValue("");
    setImagePreviewUrl("");
    setImageFile(null);
    setEditingItemId(null);
  }

  /**
   * Commit the draft: replace the item being edited in place (keeping its id and
   * its position in the list), or append a new one.
   */
  function pushItem(fields: Omit<Item, "id">) {
    if (editingItemId) {
      onChange({
        ...group,
        items: group.items.map((existing) =>
          existing.id === editingItemId
            ? { id: editingItemId, ...fields }
            : existing,
        ),
      });
    } else {
      onChange({
        ...group,
        items: [...group.items, { id: crypto.randomUUID(), ...fields }],
      });
    }
    resetDraft();
  }

  /**
   * Lift an already-added item back into the form row for editing. Switching
   * straight from one item to another abandons the first with no change to it,
   * which is why nothing is written to the group here.
   */
  function beginEdit(item: Item) {
    uploadToken.current += 1;
    setAddError("");
    setEditingItemId(item.id);
    setDraftType(item.type);
    // A text item carries its body in `value` and has no separate title.
    setDraftTitle(item.type === "text" ? "" : item.title);
    setDraftValue(item.value);
    setImagePreviewUrl(item.type === "image" ? mediaUrl(item.value) : "");
    // No source file for a stored image — re-cropping needs a fresh pick, which
    // is what the Replace control is for.
    setImageFile(null);
  }

  /** Abandon an in-progress edit, leaving the stored item exactly as it was. */
  function cancelEdit() {
    uploadToken.current += 1;
    setAddError("");
    setDraftType("text");
    resetDraft();
  }

  async function selectImageFile(file: File | null) {
    if (!file || uploading) return;
    const token = (uploadToken.current += 1);
    setAddError("");
    setImagePreviewUrl("");
    setDraftValue("");
    setImageFile(null);
    if (!file.type.startsWith("image/")) {
      setAddError(t("notAnImage"));
      return;
    }
    if (file.size > MEDIA_MAX_BYTES) {
      setAddError(t("imageTooLarge"));
      return;
    }
    // Retain the source file for the optional 16:9 cropper (see applyCroppedImage).
    setImageFile(file);
    setUploading(true);
    try {
      const { key, url } = await uploadMedia(file, "item");
      // Discard a result the user has moved on from (type switched, or another
      // image picked) — writing its key now would corrupt the current draft.
      if (token !== uploadToken.current) return;
      setDraftValue(key);
      setImagePreviewUrl(url);
    } catch {
      if (token !== uploadToken.current) return;
      setAddError(t("imageUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  /**
   * Replace the staged image with an author-cropped (16:9) version: uploads the
   * cropped file and swaps in its key + preview. The default center-crop already
   * works, so this is opt-in — used by the "Adjust crop" control. The source
   * `imageFile` is left in place so the cropper can be re-opened from the
   * original. Guarded by the same token as selectImageFile so a slow crop upload
   * the author has moved on from is discarded.
   */
  async function applyCroppedImage(cropped: File) {
    const token = (uploadToken.current += 1);
    setAddError("");
    setUploading(true);
    try {
      const { key, url } = await uploadMedia(cropped, "item");
      if (token !== uploadToken.current) return;
      setDraftValue(key);
      setImagePreviewUrl(url);
    } catch {
      if (token !== uploadToken.current) return;
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

    // Empty is a silent no-op when composing (the author just hasn't typed yet),
    // but a real error when editing: they cleared an item that already exists,
    // and saying nothing would look like the save had worked.
    if (!draftValue.trim()) {
      if (editingItemId) setAddError(t("itemTextRequired"));
      return;
    }

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
    imageFile,
    addError,
    editingItemId,
    selectType,
    setDraftTitle,
    setDraftValue,
    selectImageFile,
    applyCroppedImage,
    addItem,
    beginEdit,
    cancelEdit,
  };
}
