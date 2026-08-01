"use client";

import { useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { MEDIA_MAX_BYTES } from "@/src/shared/lib/media-client";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { useUpdateAvatar, useRemoveAvatar } from "./api/avatar.mutations";
import { AvatarCropModal } from "./AvatarCropModal";

/**
 * The signed-in user's avatar manager on the profile-edit page: shows the
 * current avatar, an upload control (validates image / ≤1MB client-side before
 * the round-trip), and a remove action when one is set. Uploading runs the
 * two-step {@link useUpdateAvatar} mutation; on success it patches the header's
 * live copy via AuthContext so the change shows immediately everywhere.
 */
export function AvatarSection({
  userId,
  username,
  avatarKey,
}: {
  userId: string;
  username: string;
  avatarKey: string | null;
}) {
  const t = useTranslations("profile");
  const tCreate = useTranslations("create");
  const { setAvatarKey } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState("");
  // The picked file awaiting crop; non-null opens the crop modal. Upload doesn't
  // start until the user confirms a crop.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // True while a file is dragged over the drop zone; purely visual (border +
  // copy), reset on drop/leave. Never gates validation — handleFile is the
  // single source of truth for that, regardless of how the file arrived.
  const [dragging, setDragging] = useState(false);

  const updateAvatar = useUpdateAvatar(userId);
  const removeAvatar = useRemoveAvatar(userId);
  const busy = updateAvatar.isPending || removeAvatar.isPending;

  // Re-selecting the SAME file after a failure won't refire onChange unless the
  // input is cleared first (its value would be unchanged).
  function clearInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(file: File | null) {
    setValidationError("");
    updateAvatar.reset();
    // Clear a prior failed-remove error too, so it doesn't linger over a fresh
    // upload (both feed the shared `mutationError`).
    removeAvatar.reset();
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setValidationError(tCreate("notAnImage"));
      clearInput();
      return;
    }
    if (file.size > MEDIA_MAX_BYTES) {
      setValidationError(tCreate("imageTooLarge"));
      clearInput();
      return;
    }
    setPendingFile(file);
    clearInput();
  }

  function handleCropped(cropped: File) {
    setPendingFile(null);
    updateAvatar.mutate(cropped, {
      onSuccess: (result) => setAvatarKey(result.avatarKey),
    });
  }

  function handleRemove() {
    setValidationError("");
    removeAvatar.mutate(undefined, { onSuccess: () => setAvatarKey(null) });
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    // Required for onDrop to fire at all — browsers reject a drop on an
    // element whose dragover handler doesn't call preventDefault.
    event.preventDefault();
    if (!busy) setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    // Same handleFile as the click-to-pick path — no separate validation for
    // the dropped file.
    handleFile(event.dataTransfer.files?.[0] ?? null);
  }

  const mutationError = updateAvatar.isError
    ? messageFromError(updateAvatar.error, {
        fallback: tCreate("imageUploadFailed"),
      })
    : removeAvatar.isError
      ? t("avatarRemoveError")
      : "";
  const error = validationError || mutationError;

  // The accessible name (and drop-zone copy) tracks whether an avatar is
  // already set, not the transient drag/busy state — "Drop to upload"/
  // "Uploading…" are visual-only, a screen-reader user can't drag anyway.
  const pickLabel = avatarKey ? t("avatarReplaceLabel") : t("avatarDropLabel");
  const zoneCopy = updateAvatar.isPending
    ? tCreate("uploading")
    : dragging
      ? t("avatarDropActive")
      : pickLabel;

  return (
    // The whole card is the drop target. The file input lives in a <label> that
    // wraps ONLY the pick button — wrapping the row would make a click on
    // "Remove photo" also open the file picker.
    <section
      className={cn(
        "flex flex-col gap-[13px] rounded-card border p-5 transition-colors",
        dragging
          ? "border-dashed border-acc bg-acc/[0.04]"
          : "border-white/[0.07] bg-surface-card",
        busy && "opacity-60",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2 className="text-[11.5px] font-[650] tracking-[0.06em] text-foreground-tertiary">
        {t("avatarHeading")}
      </h2>

      <div className="flex items-center gap-4">
        <UserAvatar
          username={username}
          avatarKey={avatarKey}
          tone
          className="h-16 w-16 flex-none rounded-full border border-white/10 text-[22px]"
        />
        <div className="flex min-w-0 flex-col gap-[9px]">
          <div className="flex flex-wrap items-center gap-[9px]">
            <label
              className={cn(
                "inline-flex h-[38px] items-center rounded-[10px] border border-white/[0.12] bg-white/[0.03] px-[13px] text-[13px] text-foreground-secondary transition-colors",
                busy
                  ? "pointer-events-none"
                  : "cursor-pointer hover:border-white/25 hover:text-foreground",
              )}
            >
              {zoneCopy}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                disabled={busy}
                aria-label={pickLabel}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
            {avatarKey && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                loading={removeAvatar.isPending}
                onClick={handleRemove}
              >
                {t("avatarRemove")}
              </Button>
            )}
          </div>
          <Text variant="tertiary" className="text-xs">
            {t("avatarHint")}
          </Text>
        </div>
      </div>

      {error && (
        <Text variant="danger" className="text-sm">
          {error}
        </Text>
      )}
      {pendingFile && (
        <AvatarCropModal
          file={pendingFile}
          open
          onCancel={() => setPendingFile(null)}
          onCropped={handleCropped}
        />
      )}
    </section>
  );
}
