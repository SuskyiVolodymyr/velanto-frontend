"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useFollowMutation } from "@/src/shared/api/follow.mutations";
import { useRules } from "@/src/shared/api/rules.queries";
import { Text } from "@/src/shared/components/Text";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { AuthorProfileHeader } from "./AuthorProfileHeader";
import type { PeopleSubTab } from "./AuthorProfileHeader";
import { ProfileTabs } from "./ProfileTabs";
import { AuthorPackList } from "./AuthorPackList";
import { PeopleTab } from "./PeopleTab";
import { RecentlyPlayedSection } from "./RecentlyPlayedSection";
import { AuthorModeratorPanel } from "./AuthorModeratorPanel";
import { ReportUserButton } from "./ReportUserButton";
import { useAuthorModeration } from "./use-author-moderation";
import {
  useAuthor,
  useAuthorBanHistory,
  authorQueryOptions,
} from "./api/author.queries";
import type { AuthorData } from "./api/author";
import { cn } from "@/src/shared/lib/cn";
import { pageContainer } from "@/src/shared/lib/page-container";

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
  const th = useTranslations("header");
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

  // AuthorProfileHeader's Followers/Following stat buttons (T1) need to jump
  // ProfileTabs straight to the People tab's matching sub-tab, even from an
  // already-mounted state. ProfileTabs only reads its `initialTab`/
  // `initialPeopleSubTab` props once, on mount (see its own doc comment), so
  // a live prop change alone wouldn't move the selection — instead we force a
  // full remount by changing `key` below. `nonce` increments on every jump
  // (not just every *different* subTab) so clicking the same stat twice in a
  // row still remounts and re-seeds the sub-tab.
  const [peopleJump, setPeopleJump] = useState<{
    subTab: PeopleSubTab;
    nonce: number;
  } | null>(null);

  if (authorQuery.isLoading) return null;

  if (authorQuery.isError || !authorQuery.data) {
    return (
      <>
        <PageHeader back={{ href: "/", label: th("browse") }} />
        <div className="mx-auto max-w-md py-16 text-center">
          <Text variant="danger">{t("userNotFound")}</Text>
        </div>
      </>
    );
  }

  const { profile, packs, packsTotal } = authorQuery.data;

  return (
    <>
      <PageHeader
        back={{ href: "/", label: th("browse") }}
        trailing={
          isOwnProfile ? (
            <Link
              href="/settings"
              className="flex h-[38px] items-center rounded-[11px] border border-white/[0.09] bg-surface-card px-[14px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:border-white/20 hover:text-foreground"
            >
              {th("settings")}
            </Link>
          ) : (
            // Someone else's page: report the account. Lives in the header
            // beside Back for the same reason the pack's Report does — it acts
            // on the whole page, not on any one section of it.
            <ReportUserButton userId={authorId} username={profile.username} />
          )
        }
      />
      <div className={cn(pageContainer(1320), "py-10")}>
        <AuthorProfileHeader
          authorId={authorId}
          profile={profile}
          packsTotal={packsTotal}
          isOwnProfile={isOwnProfile}
          followBusy={follow.isPending}
          followBlocked={follow.blocked}
          followError={follow.isError ? t("followError") : ""}
          onFollowToggle={() => follow.toggle(profile.isFollowedByMe ?? false)}
          onSelectPeopleTab={(subTab) =>
            setPeopleJump((prev) => ({ subTab, nonce: (prev?.nonce ?? 0) + 1 }))
          }
        />

        {showModeratorTools && (
          <AuthorModeratorPanel
            authorId={authorId}
            moderation={moderation}
            banHistoryQuery={banHistoryQuery}
            ruleCategories={ruleCategories}
          />
        )}

        <ProfileTabs
          // Remount on every People deep-link jump so `initialTab`/
          // `initialPeopleSubTab` (only consulted once, on mount) pick up the
          // new target — see the `peopleJump` comment above.
          key={
            peopleJump
              ? `people-${peopleJump.subTab}-${peopleJump.nonce}`
              : "default"
          }
          isOwnProfile={isOwnProfile}
          packsCount={packsTotal}
          peopleCount={profile.followerCount + profile.followingCount}
          initialTab={peopleJump ? "people" : "packs"}
          initialPeopleSubTab={peopleJump?.subTab ?? "followers"}
          packsPanel={
            <AuthorPackList
              authorId={authorId}
              initialPacks={packs}
              initialTotal={packsTotal}
              // Your own page shows your pending/rejected packs with status
              // badges, just like the old /profile did.
              own={isOwnProfile}
            />
          }
          peoplePanel={(subTab) => (
            <PeopleTab authorId={authorId} initialSubTab={subTab} />
          )}
          historyPanel={
            // Play history is public unless the user opted out; the owner and
            // staff can always see it. `showPlayHistory` may be undefined on
            // older fixtures — treat only an explicit `false` as opted out.
            <RecentlyPlayedSection
              userId={authorId}
              visible={
                profile.showPlayHistory !== false ||
                isOwnProfile ||
                isModeratorPlus
              }
              // On your own profile, show an empty-state placeholder instead of
              // collapsing, so the section is discoverable before you've played.
              showEmptyState={isOwnProfile}
            />
          }
        />
      </div>
    </>
  );
}
