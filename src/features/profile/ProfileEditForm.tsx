"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import {
  useMyProfile,
  useUpdateBio,
} from "@/src/features/profile/api/profile.queries";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";

const BIO_MAX = 280;

export function ProfileEditForm() {
  const t = useTranslations("profile");
  const { user, status: authStatus } = useAuth();
  const router = useRouter();

  const profileQuery = useMyProfile(user?.id ?? "", {
    enabled: authStatus === "authenticated" && !!user,
  });
  // `draft` is null until the user edits; the textarea shows the fetched bio
  // until then (avoids seeding local state from the query in an effect).
  const [draft, setDraft] = useState<string | null>(null);
  const bio = draft ?? profileQuery.data?.bio ?? "";

  const saveMutation = useUpdateBio(user?.id ?? "");
  const pending = saveMutation.isPending;
  const saveError = saveMutation.isError
    ? messageFromError(saveMutation.error, { fallback: t("saveError") })
    : null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    saveMutation.mutate(bio, { onSuccess: () => router.push("/profile") });
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
        <Text className="text-danger">{t("loadBioError")}</Text>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-md px-7 py-10"
    >
      <Text as="h1" variant="title" className="mb-6 text-2xl">
        {t("editProfile")}
      </Text>

      <label className="mb-2 flex items-center justify-between">
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
        <Text className="mt-3 text-sm text-danger">{saveError}</Text>
      )}

      <Button type="submit" disabled={pending} className="mt-6 w-fit">
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
