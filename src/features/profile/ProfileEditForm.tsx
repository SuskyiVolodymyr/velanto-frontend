"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import {
  useMyProfile,
  useUpdateBio,
  useChangeUsername,
} from "@/src/features/profile/api/profile.queries";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { ApiError } from "@/src/shared/lib/api-client";
import { USERNAME_PATTERN } from "@/src/features/auth/auth.schema";
import { Text } from "@/src/shared/components/Text";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { Badge } from "@/src/shared/components/Badge";
import { BackButton } from "@/src/shared/components/BackButton";
import { AvatarSection } from "@/src/features/profile/AvatarSection";
import { ProfileEditPreview } from "@/src/features/profile/ProfileEditPreview";
import { cn } from "@/src/shared/lib/cn";
import { pageContainer } from "@/src/shared/lib/page-container";

const BIO_MAX = 280;
const USERNAME_MAX = 16;

export function ProfileEditForm() {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const tAuthErrors = useTranslations("auth.errors");
  const { user, status: authStatus, patchUser } = useAuth();

  const profileQuery = useMyProfile(user?.id ?? "", {
    enabled: authStatus === "authenticated" && !!user,
  });
  // Each `*Draft` is null until the user edits that field; the input shows the
  // fetched value until then (avoids seeding local state from the query in an
  // effect).
  const [draft, setDraft] = useState<string | null>(null);
  const savedBio = profileQuery.data?.bio ?? "";
  const bio = draft ?? savedBio;
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const currentUsername = profileQuery.data?.username ?? "";
  const username = usernameDraft ?? currentUsername;
  // True once the username field has been touched (typed in or blurred) once —
  // gates the live format error so it doesn't show before the user has done
  // anything (D8: validate on every keystroke once touched, not only on submit).
  const [usernameTried, setUsernameTried] = useState(false);
  // Server-side error only (409-taken, or any other backend failure from the
  // last submit attempt) — the format error is derived live below instead of
  // being stored here.
  const [usernameServerError, setUsernameServerError] = useState<string | null>(
    null,
  );
  // Stays true until the next edit (bio or username) — an inline confirmation,
  // not a toast, per the mock's "stays until the next edit" spec. Unlike
  // CreatePackForm's `justSaved` this deliberately has no auto-revert timer.
  const [saved, setSaved] = useState(false);

  const saveMutation = useUpdateBio(user?.id ?? "");
  const changeUsername = useChangeUsername(user?.id ?? "");
  const pending = saveMutation.isPending || changeUsername.isPending;
  const saveError = saveMutation.isError
    ? messageFromError(saveMutation.error, { fallback: t("saveError") })
    : null;

  const trimmedUsername = username.trim();
  const usernameDirty = trimmedUsername !== currentUsername;
  const bioDirty = bio !== savedBio;
  const dirty = bioDirty || usernameDirty;
  const usernameFormatInvalid =
    usernameDirty && !USERNAME_PATTERN.test(trimmedUsername);
  const usernameFormatError =
    usernameTried && usernameFormatInvalid ? tAuthErrors("username") : null;
  const usernameError = usernameServerError ?? usernameFormatError;
  const canSave = dirty && !usernameFormatInvalid;

  const cancelHref = user ? `/users/${user.id}` : "/profile";

  function handleBioChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value.slice(0, BIO_MAX));
    setSaved(false);
  }

  function handleUsernameChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUsernameDraft(event.target.value.slice(0, USERNAME_MAX));
    setUsernameTried(true);
    setUsernameServerError(null);
    setSaved(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setUsernameServerError(null);
    saveMutation.reset();

    const nextUsername = username.trim();
    // Only touch the username endpoint when it actually changed; validate the
    // format client-side first so an obviously bad handle never round-trips.
    if (nextUsername !== currentUsername) {
      if (!USERNAME_PATTERN.test(nextUsername)) {
        setUsernameTried(true);
        return;
      }
      try {
        await changeUsername.mutateAsync(nextUsername);
        // Reflect the new handle in header chrome immediately.
        patchUser({ username: nextUsername });
      } catch (err) {
        setUsernameServerError(
          err instanceof ApiError && err.status === 409
            ? t("usernameTaken")
            : messageFromError(err, { fallback: t("saveError") }),
        );
        return;
      }
    }

    // Stay on the page and show an inline "Saved" confirmation instead of
    // navigating away — the mock's preview card (T10) needs the draft state to
    // stick around, and a redirect-on-save would give the confirmation no time
    // to be seen at all.
    saveMutation.mutate(bio, {
      onSuccess: () => setSaved(true),
    });
  }

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{t("loginRequiredEdit")}</Text>
      </div>
    );
  }

  if (profileQuery.isLoading) return null;

  if (profileQuery.isError) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="danger">{t("loadBioError")}</Text>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className={cn(pageContainer(680), "flex items-center gap-2 py-3")}>
          <BackButton href={cancelHref} label={t("backToProfile")} />
          <Text variant="tertiary" aria-hidden className="text-sm">
            /
          </Text>
          <Text as="h1" variant="secondary" className="text-sm font-semibold">
            {t("editProfile")}
          </Text>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={cn(pageContainer(680), "py-10")}>
        {profileQuery.data && (
          <AvatarSection
            userId={user?.id ?? ""}
            username={profileQuery.data.username}
            avatarKey={profileQuery.data.avatarKey ?? null}
          />
        )}

        <div className="mb-2 mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="profile-username">
              <Text variant="secondary" className="text-xs">
                {tAuth("username")}
              </Text>
            </label>
            {usernameDirty && (
              <Badge variant="accent" className="text-[10px]">
                {t("usernameChangedPill")}
              </Badge>
            )}
          </div>
          <Text variant="tertiary" className="text-xs">
            {username.length}/{USERNAME_MAX}
          </Text>
        </div>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-sm text-foreground-tertiary"
          >
            @
          </span>
          <input
            id="profile-username"
            type="text"
            value={username}
            onChange={handleUsernameChange}
            onBlur={() => setUsernameTried(true)}
            maxLength={USERNAME_MAX}
            autoComplete="username"
            className="w-full rounded-[10px] border border-border bg-surface p-3 ps-7 text-sm text-foreground placeholder:text-foreground-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
          />
        </div>
        {usernameError && (
          <Text variant="danger" className="mt-2 text-sm">
            {usernameError}
          </Text>
        )}

        <label className="mb-2 mt-6 flex items-center justify-between">
          <Text variant="secondary" className="text-xs">
            {t("bio")}
          </Text>
          <Text variant="tertiary" className="text-xs">
            {bio.length}/{BIO_MAX}
          </Text>
        </label>
        <textarea
          value={bio}
          onChange={handleBioChange}
          maxLength={BIO_MAX}
          rows={4}
          placeholder={t("bioPlaceholder")}
          className="w-full rounded-[10px] border border-border bg-surface p-3 text-sm text-foreground placeholder:text-foreground-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
        />

        <div className="mt-6">
          <ProfileEditPreview
            username={username}
            bio={bio}
            role={profileQuery.data?.role}
            trusted={profileQuery.data?.trusted}
            avatarKey={profileQuery.data?.avatarKey}
          />
        </div>

        {saveError && (
          <Text variant="danger" className="mt-3 text-sm">
            {saveError}
          </Text>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" loading={pending} disabled={!canSave}>
            {pending ? t("saving") : t("save")}
          </Button>
          <Link href={cancelHref} className={buttonClassName("outline")}>
            {t("cancel")}
          </Link>
        </div>

        {saved && (
          <p
            role="status"
            className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-acc"
          >
            <Check size={16} aria-hidden />
            {t("editSaved")}
          </p>
        )}
      </form>
    </>
  );
}
