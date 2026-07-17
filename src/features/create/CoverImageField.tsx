"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { uploadMedia, MEDIA_MAX_BYTES } from "@/src/shared/lib/media-client";
import { mediaUrl } from "@/src/shared/lib/media-url";
import { Button } from "@/src/shared/components/Button";
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

  return (
    <div className="flex flex-col gap-2">
      <Text variant="secondary" className="text-xs">
        {t("coverImage")}
      </Text>
      <div className="flex items-center gap-3">
        {coverImageKey && (
          <span className="relative h-14 w-[74px] shrink-0 overflow-hidden rounded-[10px] border border-border bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element -- CDN-resolved preview of the just-uploaded, already-processed cover */}
            <img
              src={mediaUrl(coverImageKey)}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(
              "cursor-pointer rounded-[9px] border border-border bg-white/[0.03] px-3 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground",
              busy && "pointer-events-none opacity-60",
            )}
          >
            {uploading ? t("uploading") : t("chooseImage")}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              disabled={busy}
              aria-label={t("coverImage")}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
          {coverImageKey && (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={handleRemove}
            >
              {t("removeCoverImage")}
            </Button>
          )}
        </div>
      </div>
      <Text variant="tertiary" className="text-xs">
        {t("coverImageHint")}
      </Text>
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
