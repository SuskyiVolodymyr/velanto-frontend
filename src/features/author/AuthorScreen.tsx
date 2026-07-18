"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useFollowMutation } from "@/src/shared/api/follow.mutations";
import { useRules } from "@/src/shared/api/rules.queries";
import { Text } from "@/src/shared/components/Text";
import { AuthorProfileHeader } from "./AuthorProfileHeader";
import { AuthorPackList } from "./AuthorPackList";
import { RecentlyPlayedSection } from "./RecentlyPlayedSection";
import { AuthorModeratorPanel } from "./AuthorModeratorPanel";
import { useAuthorModeration } from "./use-author-moderation";
import {
  useAuthor,
  useAuthorBanHistory,
  authorQueryOptions,
} from "./api/author.queries";
import type { AuthorData } from "./api/author";

export type { AuthorData };

export function AuthorScreen({
  authorId,
  initialData,
}: {
  authorId: string;
  /**
   * Server-seeded public profile + first page of packs. When present the
   * screen renders immediately server-side (indexable) and skips the mount
   * fetch; viewer-specific fields (isFollowedByMe) refresh only on a later
   * follow action / authorId change. Omitted → full client-fetch path.
   */
  initialData?: AuthorData;
}) {
  const t = useTranslations("profile");
  const { user, status: authStatus } = useAuth();

  const authorQuery = useAuthor(authorId, initialData);

  const isOwnProfile = authStatus === "authenticated" && user?.id === authorId;
  const isModeratorPlus =
    user?.role === "moderator" ||
    user?.role === "manager" ||
    user?.role === "admin";
  const showModeratorTools = isModeratorPlus && !isOwnProfile;

  // Ban history is a second, gated fetch: only for a moderator viewing someone
  // else's page, and only once the profile itself has loaded.
  const banHistoryQuery = useAuthorBanHistory(authorId, {
    enabled: showModeratorTools && authorQuery.data !== undefined,
  });

  // Rule categories resolve each ban-history entry's reason id (e.g.
  // `spam_manipulation`) to its human title, shared with the ban picker below.
  // Gated to the moderator view so a plain visitor never triggers the fetch.
  const rulesQuery = useRules({ enabled: showModeratorTools });
  const ruleCategories = rulesQuery.data?.categories ?? [];

  const moderation = useAuthorModeration(authorId);

  // Follow state lives in the fetched author cache (patched by the mutation on
  // success), so it survives an authorId-change refetch and popover churn.
  const follow = useFollowMutation<AuthorData>(
    authorId,
    authorQueryOptions(authorId).queryKey,
  );

  if (authorQuery.isLoading) return null;

  if (authorQuery.isError || !authorQuery.data) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="danger">{t("userNotFound")}</Text>
      </div>
    );
  }

  const { profile, packs, packsTotal } = authorQuery.data;

  return (
    <div className="mx-auto w-full max-w-4xl px-7 py-10">
      <AuthorProfileHeader
        authorId={authorId}
        profile={profile}
        packsTotal={packsTotal}
        isOwnProfile={isOwnProfile}
        followBusy={follow.isPending}
        followBlocked={follow.blocked}
        followError={follow.isError ? t("followError") : ""}
        onFollowToggle={() => follow.toggle(profile.isFollowedByMe ?? false)}
      />

      {showModeratorTools && (
        <AuthorModeratorPanel
          authorId={authorId}
          moderation={moderation}
          banHistoryQuery={banHistoryQuery}
          ruleCategories={ruleCategories}
        />
      )}

      <AuthorPackList
        authorId={authorId}
        initialPacks={packs}
        initialTotal={packsTotal}
        // Your own page shows your pending/rejected packs with status badges,
        // just like the old /profile did.
        own={isOwnProfile}
      />

      {/* Play history is public unless the user opted out; the owner and staff
          can always see it. `showPlayHistory` may be undefined on older
          fixtures — treat only an explicit `false` as opted out. */}
      <RecentlyPlayedSection
        userId={authorId}
        visible={
          profile.showPlayHistory !== false || isOwnProfile || isModeratorPlus
        }
        // On your own profile, show an empty-state placeholder instead of
        // collapsing, so the section is discoverable before you've played.
        showEmptyState={isOwnProfile}
      />
    </div>
  );
}
