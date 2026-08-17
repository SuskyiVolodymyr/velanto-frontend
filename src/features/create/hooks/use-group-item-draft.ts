"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Group, Item, ItemType } from "@/types/pack";
import { extractYouTubeId } from "@/utils/youtube";
import { fetchYouTubeOEmbed } from "@/utils/youtube-oembed";
import { mediaUrl } from "@/utils/media-url";
import { useItemImageUpload } from "@/features/create/hooks/use-item-image-upload";

/**
 * Owns the "add an item" draft state for a single {@link GroupEditor} — the
 * text/youtube/image toggle, the draft fields, in-flight oEmbed validation, and
 * the add-error message. Lifted out of the editor so the group-level controls
 * can share the busy flags (they disable while an add is in flight).
 *
 * For an image item the file is uploaded the moment it's picked; that whole
 * race — token, in-flight promise, superseded results — lives in
 * {@link useItemImageUpload}. Here the staged KEY simply arrives as
 * `draftValue`, and is committed as the item value when Add is pressed.
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
  // Id of the already-added item being edited, or null when composing a new one.
  // The item deliberately STAYS in `group.items` while it's edited — the chip is
  // only hidden — so abandoning the edit (switching to another chip, or just
  // submitting the form) leaves the original intact instead of dropping it.
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const t = useTranslations("create");

  const image = useItemImageUpload({
    onValue: setDraftValue,
    onError: setAddError,
  });

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
    image.invalidate();
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
    image.clearStaged();
  }

  function resetDraft() {
    setDraftTitle("");
    setDraftValue("");
    image.clearStaged();
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
    image.invalidate();
    setAddError("");
    setEditingItemId(item.id);
    setDraftType(item.type);
    // A text item carries its body in `value` and has no separate title.
    setDraftTitle(item.type === "text" ? "" : item.title);
    setDraftValue(item.value);
    image.showStored(item.type === "image" ? mediaUrl(item.value) : "");
  }

  /** Abandon an in-progress edit, leaving the stored item exactly as it was. */
  function cancelEdit() {
    image.invalidate();
    setAddError("");
    setDraftType("text");
    resetDraft();
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
    const uploadedKey = await image.awaitPending();
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
    (image.uploading ||
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
    uploading: image.uploading,
    imagePreviewUrl: image.previewUrl,
    imageFile: image.file,
    addError,
    editingItemId,
    selectType,
    setDraftTitle,
    setDraftValue,
    selectImageFile: image.pick,
    applyCroppedImage: image.applyCrop,
    addItem,
    beginEdit,
    cancelEdit,
  };
}
