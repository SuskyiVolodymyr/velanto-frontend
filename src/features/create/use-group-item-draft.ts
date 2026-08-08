"use client";

import { useEffect, useRef, useState } from "react";
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
  // The upload currently in flight, resolving to the storage key it staged (or
  // null if it was superseded or failed). `addItem` awaits it rather than
  // refusing to run, so pressing Save mid-upload commits the image once it
  // lands instead of doing nothing at all (#437). It also resolves the stale
  // closure: `draftValue` captured at render time is still "" when the upload
  // completes, so the key has to come back through this promise.
  const pendingUpload = useRef<Promise<string | null> | null>(null);
  // Token of the upload that currently owns the `uploading` flag. Separate from
  // `uploadToken` because that one is also bumped by a type switch or an edit,
  // and only the request that still owns the flag may clear it — otherwise a
  // superseded upload resolving first would report "done" while a newer one is
  // still running.
  const activeUpload = useRef<number | null>(null);
  // The current pool and its onChange. `addItem` now awaits an in-flight
  // upload, and the props captured by the click handler's render can be
  // seconds stale by the time it resumes — committing against that snapshot
  // would resurrect an item the author deleted while waiting, or undo a rename
  // they typed. Written after every commit, so it is always the live pair.
  const latest = useRef({ group, onChange });
  useEffect(() => {
    latest.current = { group, onChange };
  });
  // True between entering `addItem` and its commit. Save is live during upload
  // now, so it can be pressed twice; without this both presses would await the
  // same upload, resume in the same microtask drain (no re-render between) and
  // append the item twice.
  const committing = useRef(false);

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
    const { group: current, onChange: commit } = latest.current;
    if (editingItemId) {
      commit({
        ...current,
        items: current.items.map((existing) =>
          existing.id === editingItemId
            ? { id: editingItemId, ...fields }
            : existing,
        ),
      });
    } else {
      commit({
        ...current,
        items: [...current.items, { id: crypto.randomUUID(), ...fields }],
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

  /**
   * Upload a file and stage its key, unless the author has moved on in the
   * meantime. Resolves to the staged key so a caller that started the upload
   * (or `addItem`, waiting on it) can use the value without waiting for the
   * `draftValue` state to come back around through a re-render.
   */
  async function runUpload(file: File, token: number): Promise<string | null> {
    try {
      const { key, url } = await uploadMedia(file, "item");
      // Discard a result the user has moved on from (type switched, or another
      // image picked) — writing its key now would corrupt the current draft.
      if (token !== uploadToken.current) return null;
      setDraftValue(key);
      setImagePreviewUrl(url);
      return key;
    } catch {
      if (token !== uploadToken.current) return null;
      setAddError(t("imageUploadFailed"));
      return null;
    } finally {
      // Only the newest upload owns these — an older one resolving late must
      // not clear the flag (or the pending promise) out from under it.
      if (activeUpload.current === token) {
        activeUpload.current = null;
        pendingUpload.current = null;
        setUploading(false);
      }
    }
  }

  async function selectImageFile(file: File | null) {
    if (!file) return;
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
    // Dropping a second picture while the first is still uploading used to be
    // ignored outright, which looked exactly like a drop that hadn't
    // registered. The token bump makes the first result harmless, so the
    // newer file simply wins.
    activeUpload.current = token;
    const upload = runUpload(file, token);
    pendingUpload.current = upload;
    await upload;
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
    activeUpload.current = token;
    const upload = runUpload(cropped, token);
    pendingUpload.current = upload;
    await upload;
  }

  /**
   * Commit the draft, returning whether an item was actually added/saved.
   * The caller (GroupEditor, T5) uses this to know when it's safe to collapse
   * the add/edit panel back to the dashed trigger — a validation failure
   * leaves the panel open with its error showing instead.
   */
  async function addItem(): Promise<boolean> {
    if (committing.current) return false;
    setAddError("");

    if (draftType === "image") {
      committing.current = true;
      try {
        return await addImageItem();
      } finally {
        committing.current = false;
      }
    }

    // Only the youtube path can be validating, and only its own oEmbed check
    // is worth waiting on. Bailing here for an IMAGE draft was a silent
    // refusal — the exact failure mode this fix exists to remove.
    if (validating) return false;
    return addNonImageItem();
  }

  /** The image branch of {@link addItem} — the one that can wait on an upload. */
  async function addImageItem(): Promise<boolean> {
    // Save pressed mid-upload used to return false without saying anything,
    // and the author's next click discarded the upload it was waiting on
    // (#437). Wait for it instead — the key comes back from the promise
    // because this closure's `draftValue` predates it.
    const uploadedKey = pendingUpload.current
      ? await pendingUpload.current
      : null;
    const value = uploadedKey ?? draftValue;
    if (!value) {
      setAddError(t("imageRequired"));
      return false;
    }
    if (!draftTitle.trim()) {
      setAddError(t("imageTitleRequired"));
      return false;
    }
    pushItem({ type: "image", title: draftTitle.trim(), value });
    return true;
  }

  /** The text/youtube branch of {@link addItem} — no upload to wait on. */

  async function addNonImageItem(): Promise<boolean> {
    // Empty is a silent no-op when composing (the author just hasn't typed yet),
    // but a real error when editing: they cleared an item that already exists,
    // and saying nothing would look like the save had worked.
    if (!draftValue.trim()) {
      if (editingItemId) setAddError(t("itemTextRequired"));
      return false;
    }

    if (draftType === "text") {
      pushItem({
        type: "text",
        title: draftValue.trim(),
        value: draftValue.trim(),
      });
      return true;
    }

    const videoId = extractYouTubeId(draftValue.trim());
    if (!videoId) {
      setAddError(t("notYoutubeLink"));
      return false;
    }

    if (!draftTitle.trim()) {
      setAddError(t("linkTitleRequired"));
      return false;
    }

    setValidating(true);
    try {
      // Confirm the video actually exists; the title is the creator's own,
      // required input (no oEmbed fallback).
      const result = await fetchYouTubeOEmbed(draftValue.trim());
      if (!result) {
        setAddError(t("videoNotFound"));
        return false;
      }

      pushItem({
        type: "youtube",
        title: draftTitle.trim(),
        value: draftValue.trim(),
      });
      return true;
    } finally {
      setValidating(false);
    }
  }

  // The open panel is holding image work that no pack-level Save can reach: an
  // upload in flight, or a staged key that isn't already what the stored item
  // holds. Items only enter the pack through addItem, so anything true here is
  // one careless click away from being lost silently (#437).
  const storedEditingItem = editingItemId
    ? group.items.find((existing) => existing.id === editingItemId)
    : undefined;
  const hasUncommittedImage =
    draftType === "image" &&
    (uploading ||
      (draftValue !== "" &&
        !(
          storedEditingItem?.type === "image" &&
          storedEditingItem.value === draftValue
        )));

  /**
   * Save a staged image before the panel is taken away from the author, and
   * report whether it's safe to proceed. Called when they click straight
   * through to another item — the click reads as "done with this one", but the
   * panel closing used to discard the upload with it.
   *
   * Only IMAGE work is rescued this way. A half-typed text draft abandoned by
   * clicking elsewhere is still discarded, as before: it costs nothing, and
   * committing it would save words the author never confirmed.
   */
  async function commitPendingImage(): Promise<boolean> {
    if (!hasUncommittedImage) return true;
    return addItem();
  }

  return {
    hasUncommittedImage,
    commitPendingImage,
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
