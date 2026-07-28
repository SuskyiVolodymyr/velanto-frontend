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
    <section className="mb-8">
      <Text as="h2" variant="secondary" className="mb-3 text-xs">
        {t("avatarHeading")}
      </Text>
      <label
        className={cn(
          "flex items-center gap-4 rounded-tile border border-dashed border-white/[0.14] px-4 py-4 transition-colors",
          dragging
            ? "border-solid border-acc"
            : "hover:border-white/[0.18]",
          busy ? "pointer-events-none opacity-60" : "cursor-pointer",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UserAvatar
          username={username}
          avatarKey={avatarKey}
          className="h-16 w-16 flex-none rounded-full border border-border bg-surface text-xl text-foreground-secondary"
        />
        <div className="flex flex-col gap-1">
          <Text className="text-sm font-medium text-foreground-secondary">
            {zoneCopy}
          </Text>
          <Text variant="tertiary" className="text-xs">
            {t("avatarHint")}
          </Text>
        </div>
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
          variant="secondary"
          className="mt-2"
          disabled={busy}
          loading={removeAvatar.isPending}
          onClick={handleRemove}
        >
          {t("avatarRemove")}
        </Button>
      )}
      {error && (
        <Text variant="danger" className="mt-3 text-sm">
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
