"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { uploadMedia, MEDIA_MAX_BYTES } from "@/api/media-client";

export interface UseItemImageUploadOptions {
  /** Called with the staged storage key, or "" to clear the draft's value. */
  onValue: (value: string) => void;
  /** Called with a message to show, or "" to clear the current one. */
  onError: (message: string) => void;
}

/**
 * The image half of {@link useGroupItemDraft}: pick a file, validate it, upload
 * it, and stage the returned storage key — while surviving the author moving on
 * mid-flight.
 *
 * Split out because the race handling is a job of its own: three refs, a
 * monotonic token, and an awaitable in-flight promise, none of which the rest of
 * the draft needs to know about.
 */
export function useItemImageUpload({
  onValue,
  onError,
}: UseItemImageUploadOptions) {
  const t = useTranslations("create");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  // The original picked file, kept after upload so the author can re-open the
  // 16:9 cropper and re-frame it (always cropping from the source, never a
  // previous crop). Null when there's no staged image.
  const [file, setFile] = useState<File | null>(null);

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

  /**
   * Upload a file and stage its key, unless the author has moved on in the
   * meantime. Resolves to the staged key so a caller that started the upload
   * (or `addItem`, waiting on it) can use the value without waiting for the
   * `draftValue` state to come back around through a re-render.
   */
  async function runUpload(
    source: File,
    token: number,
  ): Promise<string | null> {
    try {
      const { key, url } = await uploadMedia(source, "item");
      // Discard a result the user has moved on from (type switched, or another
      // image picked) — writing its key now would corrupt the current draft.
      if (token !== uploadToken.current) return null;
      onValue(key);
      setPreviewUrl(url);
      return key;
    } catch {
      if (token !== uploadToken.current) return null;
      onError(t("imageUploadFailed"));
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

  async function pick(source: File | null) {
    if (!source) return;
    const token = (uploadToken.current += 1);
    onError("");
    setPreviewUrl("");
    onValue("");
    setFile(null);
    if (!source.type.startsWith("image/")) {
      onError(t("notAnImage"));
      return;
    }
    if (source.size > MEDIA_MAX_BYTES) {
      onError(t("imageTooLarge"));
      return;
    }
    // Retain the source file for the optional 16:9 cropper (see applyCrop).
    setFile(source);
    setUploading(true);
    // Dropping a second picture while the first is still uploading used to be
    // ignored outright, which looked exactly like a drop that hadn't
    // registered. The token bump makes the first result harmless, so the
    // newer file simply wins.
    activeUpload.current = token;
    const upload = runUpload(source, token);
    pendingUpload.current = upload;
    await upload;
  }

  /**
   * Replace the staged image with an author-cropped (16:9) version: uploads the
   * cropped file and swaps in its key + preview. The default center-crop already
   * works, so this is opt-in — used by the "Adjust crop" control. The source
   * file is left in place so the cropper can be re-opened from the original.
   * Guarded by the same token as `pick` so a slow crop upload the author has
   * moved on from is discarded.
   */
  async function applyCrop(cropped: File) {
    const token = (uploadToken.current += 1);
    onError("");
    setUploading(true);
    activeUpload.current = token;
    const upload = runUpload(cropped, token);
    pendingUpload.current = upload;
    await upload;
  }

  /**
   * Bump the token so anything in flight is discarded on arrival. Called when
   * the draft moves on — a type switch, or entering/leaving an edit.
   */
  function invalidate() {
    uploadToken.current += 1;
  }

  /** Drop the staged preview and source file, WITHOUT discarding an upload. */
  function clearStaged() {
    setPreviewUrl("");
    setFile(null);
  }

  /**
   * Show an already-stored image while editing. No source file — re-cropping
   * needs a fresh pick, which is what the Replace control is for.
   */
  function showStored(url: string) {
    setPreviewUrl(url);
    setFile(null);
  }

  /** The in-flight upload's staged key, or null when there is nothing to wait for. */
  function awaitPending(): Promise<string | null> {
    return pendingUpload.current ?? Promise.resolve(null);
  }

  return {
    uploading,
    previewUrl,
    file,
    pick,
    applyCrop,
    invalidate,
    clearStaged,
    showStored,
    awaitPending,
  };
}
