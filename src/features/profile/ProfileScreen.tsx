"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/shared/lib/auth-context";
import { authorQueryOptions } from "@/src/features/author/api/author.queries";
import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import { AvatarLightbox } from "@/src/shared/components/AvatarLightbox";
import { buttonClassName } from "@/src/shared/components/Button";
import { AuthorPackList } from "@/src/features/author/AuthorPackList";
import { RecentlyPlayedSection } from "@/src/features/author/RecentlyPlayedSection";

export function ProfileScreen() {
  const t = useTranslations("profile");
  const { user, status: authStatus } = useAuth();

  // The current user's own profile + packs is the same data as the author page,
  // so it shares that query (and cache).
  const profileQuery = useQuery({
    ...authorQueryOptions(user?.id ?? ""),
    enabled: authStatus === "authenticated" && !!user,
  });
  const profile = profileQuery.data?.profile ?? null;
  const packs = profileQuery.data?.packs ?? [];
  const packsTotal = profileQuery.data?.packsTotal ?? 0;

  if (authStatus === "loading") return null;

  if (authStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{t("loginRequiredView")}</Text>
        <Link
          href="/auth?next=%2Fprofile"
          className={buttonClassName("primary", "mt-4 w-fit")}
        >
          {t("logIn")}
        </Link>
      </div>
    );
  }

  if (profileQuery.isLoading) return null;

  if (profileQuery.isError || !profile) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="danger">{t("loadProfileError")}</Text>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-7 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <AvatarLightbox
            username={profile.username}
            avatarKey={profile.avatarKey}
            className="h-16 w-16 rounded-full border border-border bg-surface text-xl text-foreground-secondary"
          />
          <div>
            <Text as="h1" variant="title" className="text-2xl">
              <Username
                username={profile.username}
                role={profile.role}
                trusted={profile.trusted}
                showRole
              />
            </Text>
            <Text variant="tertiary" className="text-sm">
              {t("followerCount", { count: profile.followerCount })}
            </Text>
          </div>
        </div>
        <Link
          href="/profile/edit"
          className={buttonClassName("secondary", "w-fit")}
        >
          {t("editProfile")}
        </Link>
      </div>

      <div className="mb-10">
        {profile.bio ? (
          <Text variant="secondary">{profile.bio}</Text>
        ) : (
          <Link href="/profile/edit">
            <Text variant="tertiary" className="italic">
              {t("addBioPrompt")}
            </Text>
          </Link>
        )}
      </div>

      <AuthorPackList
        authorId={profile.id}
        initialPacks={packs}
        initialTotal={packsTotal}
        own
      />

      {/* The owner always sees their own play history regardless of the
          public opt-out, so this is unconditionally visible; the section
          self-collapses when there are no plays. */}
      <RecentlyPlayedSection userId={profile.id} visible />
    </div>
  );
}
