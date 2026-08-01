"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { uploadMedia, MEDIA_MAX_BYTES } from "@/src/shared/lib/media-client";
import { mediaUrl } from "@/src/shared/lib/media-url";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { CoverCropModal } from "@/src/features/create/CoverCropModal";
import type { CreatePackValues } from "@/src/features/create/create-pack.schema";

/**
 * Optional custom cover-image control for the create/edit form. Uploads the
 * picked file to the media endpoint (client-validated as an image ≤1MB first),
 * stores the returned storage KEY in the form's `coverImageKey`, previews it, and
 * lets the author remove it (falling back to the gradient `coverTone`). Coexists
 * with the tone swatches — a set cover takes visual precedence in the preview and
 * everywhere the pack renders.
 */
export function CoverImageField({
  onUploadingChange,
}: {
  // Lifts the in-flight upload state so the form's submit button can wait for a
  // pending cover — otherwise submitting mid-upload silently drops the chosen
  // cover (its setValue lands after the form has already navigated away).
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const t = useTranslations("create");
  const { control, setValue, formState } = useFormContext<CreatePackValues>();
  const { isSubmitting } = formState;
  const coverImageKey = useWatch({ control, name: "coverImageKey" });
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  // Nested children (icon, label) fire their own dragenter/dragleave as the
  // pointer crosses them, which would otherwise flicker `dragOver` off
  // mid-hover — a depth counter only clears it once every nested enter has
  // been balanced by a leave.
  const dragDepth = useRef(0);
  // The picked file awaiting crop; non-null opens the crop modal. Upload starts
  // only after the author confirms a crop.
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);
  // Discards a slow upload the author has moved on from (removed or replaced),
  // so its key never lands after they cleared the field.
  const uploadToken = useRef(0);

  function clearInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(file: File | null) {
    setError("");
    if (!file || uploading) return;
    if (!file.type.startsWith("image/")) {
      setError(t("notAnImage"));
      clearInput();
      return;
    }
    if (file.size > MEDIA_MAX_BYTES) {
      setError(t("imageTooLarge"));
      clearInput();
      return;
    }
    setPendingFile(file);
    clearInput();
  }

  async function handleCropped(cropped: File) {
    setPendingFile(null);
    const token = (uploadToken.current += 1);
    setUploading(true);
    try {
      const { key } = await uploadMedia(cropped, "cover");
      if (token !== uploadToken.current) return;
      setValue("coverImageKey", key, { shouldDirty: true });
    } catch {
      if (token !== uploadToken.current) return;
      setError(t("imageUploadFailed"));
    } finally {
      if (token === uploadToken.current) setUploading(false);
    }
  }

  function handleRemove() {
    uploadToken.current += 1;
    setError("");
    setValue("coverImageKey", undefined, { shouldDirty: true });
  }

  const busy = uploading || isSubmitting;
  const hasImage = Boolean(coverImageKey);

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    if (busy) return;
    dragDepth.current += 1;
    setDragOver(true);
  }
  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }
  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    if (busy) return;
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className="flex flex-col gap-2">
      <Text variant="secondary" className="text-xs">
        {t("coverImage")}
      </Text>
      {/*
        Mock: a single 64px-tall dropzone that both browses (click) and
        accepts a dropped file — its own background/border/label carry the
        empty vs. drag-over vs. has-image state, rather than a plain "Choose
        image" button plus a separate small thumbnail.
      */}
      <label
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative flex h-16 cursor-pointer items-center justify-center gap-[9px] overflow-hidden rounded-[12px] border border-dashed px-[14px] text-start text-xs font-semibold transition-colors",
          busy && "pointer-events-none opacity-60",
        )}
        style={
          hasImage
            ? { borderColor: "rgba(255,255,255,.14)" }
            : dragOver
              ? { borderColor: "#00e5ff", backgroundColor: "rgba(0,229,255,.12)", color: "#8cf3ff" }
              : {
                  borderColor: "rgba(0,229,255,.32)",
                  backgroundImage:
                    "linear-gradient(120deg, rgba(0,229,255,.09), rgba(255,92,192,.07))",
                  color: "#8cf3ff",
                }
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={busy}
          aria-label={t("coverImage")}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- CDN-resolved preview of the just-uploaded, already-processed cover */}
            <img
              src={mediaUrl(coverImageKey!)}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
              aria-label={t("removeCoverImage")}
              className="absolute right-[7px] top-[7px] z-[2] flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-[rgba(10,11,14,.72)] text-foreground hover:text-danger"
            >
              <svg
                aria-hidden
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <svg
              aria-hidden
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-none"
            >
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M12 3v13M7.5 7.5L12 3l4.5 4.5" />
            </svg>
            <span className="min-w-0">
              {uploading
                ? t("uploading")
                : dragOver
                  ? t("coverDropToUpload")
                  : t("coverDragHint")}
            </span>
          </>
        )}
      </label>
      {error && (
        <Text variant="danger" role="alert" className="text-sm">
          {error}
        </Text>
      )}
      {pendingFile && (
        <CoverCropModal
          file={pendingFile}
          open
          onCancel={() => setPendingFile(null)}
          onCropped={handleCropped}
        />
      )}
    </div>
  );
}
