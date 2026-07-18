"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Button } from "@/src/shared/components/Button";
import { AvatarSection } from "@/src/features/profile/AvatarSection";

const BIO_MAX = 280;
const USERNAME_MAX = 16;

export function ProfileEditForm() {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const tAuthErrors = useTranslations("auth.errors");
  const { user, status: authStatus, patchUser } = useAuth();
  const router = useRouter();

  const profileQuery = useMyProfile(user?.id ?? "", {
    enabled: authStatus === "authenticated" && !!user,
  });
  // Each `*Draft` is null until the user edits that field; the input shows the
  // fetched value until then (avoids seeding local state from the query in an
  // effect).
  const [draft, setDraft] = useState<string | null>(null);
  const bio = draft ?? profileQuery.data?.bio ?? "";
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const currentUsername = profileQuery.data?.username ?? "";
  const username = usernameDraft ?? currentUsername;
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const saveMutation = useUpdateBio(user?.id ?? "");
  const changeUsername = useChangeUsername(user?.id ?? "");
  const pending = saveMutation.isPending || changeUsername.isPending;
  const saveError = saveMutation.isError
    ? messageFromError(saveMutation.error, { fallback: t("saveError") })
    : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setUsernameError(null);
    saveMutation.reset();

    const nextUsername = username.trim();
    // Only touch the username endpoint when it actually changed; validate the
    // format client-side first so an obviously bad handle never round-trips.
    if (nextUsername !== currentUsername) {
      if (!USERNAME_PATTERN.test(nextUsername)) {
        setUsernameError(tAuthErrors("username"));
        return;
      }
      try {
        await changeUsername.mutateAsync(nextUsername);
        // Reflect the new handle in header chrome immediately.
        patchUser({ username: nextUsername });
      } catch (err) {
        setUsernameError(
          err instanceof ApiError && err.status === 409
            ? t("usernameTaken")
            : messageFromError(err, { fallback: t("saveError") }),
        );
        return;
      }
    }

    // Straight to the merged profile page (/users/[id]); falls back to /profile
    // (which redirects there anyway) if the id somehow isn't loaded yet.
    saveMutation.mutate(bio, {
      onSuccess: () => router.push(user ? `/users/${user.id}` : "/profile"),
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
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl px-7 py-10"
    >
      <Text as="h1" variant="title" className="mb-6 text-2xl">
        {t("editProfile")}
      </Text>

      {profileQuery.data && (
        <AvatarSection
          userId={user?.id ?? ""}
          username={profileQuery.data.username}
          avatarKey={profileQuery.data.avatarKey ?? null}
        />
      )}

      <label htmlFor="profile-username" className="mb-2 block">
        <Text variant="secondary" className="text-xs">
          {tAuth("username")}
        </Text>
      </label>
      <input
        id="profile-username"
        type="text"
        value={username}
        onChange={(event) =>
          setUsernameDraft(event.target.value.slice(0, USERNAME_MAX))
        }
        maxLength={USERNAME_MAX}
        autoComplete="username"
        className="w-full rounded-[10px] border border-border bg-surface p-3 text-sm text-foreground placeholder:text-foreground-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
      />
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
        onChange={(event) => setDraft(event.target.value.slice(0, BIO_MAX))}
        maxLength={BIO_MAX}
        rows={4}
        placeholder={t("bioPlaceholder")}
        className="w-full rounded-[10px] border border-border bg-surface p-3 text-sm text-foreground placeholder:text-foreground-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
      />

      {saveError && (
        <Text variant="danger" className="mt-3 text-sm">
          {saveError}
        </Text>
      )}

      <Button type="submit" loading={pending} className="mt-6 w-fit">
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
