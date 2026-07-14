"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { MEDIA_MAX_BYTES } from "@/src/shared/lib/media-client";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { cn } from "@/src/shared/lib/cn";
import { useUpdateAvatar, useRemoveAvatar } from "./api/avatar.mutations";

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
    updateAvatar.mutate(file, {
      onSuccess: (result) => setAvatarKey(result.avatarKey),
    });
    clearInput();
  }

  function handleRemove() {
    setValidationError("");
    removeAvatar.mutate(undefined, { onSuccess: () => setAvatarKey(null) });
  }

  const mutationError = updateAvatar.isError
    ? messageFromError(updateAvatar.error, {
        fallback: tCreate("imageUploadFailed"),
      })
    : removeAvatar.isError
      ? t("avatarRemoveError")
      : "";
  const error = validationError || mutationError;

  return (
    <section className="mb-8">
      <Text as="h2" variant="secondary" className="mb-3 text-xs">
        {t("avatarHeading")}
      </Text>
      <div className="flex items-center gap-4">
        <UserAvatar
          username={username}
          avatarKey={avatarKey}
          className="h-16 w-16 rounded-full border border-border bg-surface text-xl text-foreground-secondary"
        />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={cn(
                "cursor-pointer rounded-[9px] border border-border bg-white/[0.03] px-3 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground",
                busy && "pointer-events-none opacity-60",
              )}
            >
              {updateAvatar.isPending
                ? tCreate("uploading")
                : t("avatarChange")}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                disabled={busy}
                aria-label={t("avatarChange")}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
            {avatarKey && (
              <Button
                type="button"
                variant="secondary"
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
      {error && <Text className="mt-3 text-sm text-danger">{error}</Text>}
    </section>
  );
}
