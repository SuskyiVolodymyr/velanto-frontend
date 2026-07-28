"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { Username } from "@/src/shared/components/Username";
import { AvatarLightbox } from "@/src/shared/components/AvatarLightbox";
import { cn } from "@/src/shared/lib/cn";
import type { PublicUserProfile } from "@/src/shared/types/user";

/** Which People sub-tab a stat button deep-links into (`ProfileTabs`, later task). */
export type PeopleSubTab = "followers" | "following";

// A stat's value/label pair is baseline-aligned per the mock — the clickable
// variant (Followers/Following) shares the same visual shape, just wrapped in
// a <button> instead of a <div>.
const statPairClass = "inline-flex items-baseline gap-1.5";
const statValueClass = "text-lg font-bold tabular-nums text-foreground";
const statLabelClass = "text-sm text-foreground-tertiary";
const statButtonClass = cn(
  statPairClass,
  "rounded-[4px] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
);

/**
 * Author identity block: avatar/name/stats, the follow toggle (hidden on your
 * own page), and the optional bio. Streamer-mode redaction of the avatar and
 * name is preserved via `<Hidden>`. Follow state is owned by the screen — this
 * component only renders it and reports clicks.
 *
 * The Followers/Following stats deep-link into a future `ProfileTabs`
 * People tab via `onSelectPeopleTab` — this component no longer opens
 * `FollowListModal` itself (that wiring moves out with the modal, see
 * `docs/superpowers/plans/2026-07-28-profile-preferences-redesign.md` D2/D3).
 * `onSelectPeopleTab` is optional so this component still works stand-alone
 * (e.g. in tests) before that tab shell exists.
 */
export function AuthorProfileHeader({
  authorId,
  profile,
  packsTotal,
  isOwnProfile,
  followBusy,
  followBlocked,
  followError,
  onFollowToggle,
  onSelectPeopleTab,
}: {
  authorId: string;
  profile: PublicUserProfile;
  packsTotal: number;
  isOwnProfile: boolean;
  followBusy: boolean;
  followBlocked: boolean;
  followError: string;
  onFollowToggle: () => void;
  onSelectPeopleTab?: (subTab: PeopleSubTab) => void;
}) {
  const t = useTranslations("profile");
  const tHeader = useTranslations("header");

  // The follow control is only for signed-in viewers: a signed-out visitor
  // sees no follow button at all (not a dimmed/blocked one). `followBlocked`
  // is true exactly when the viewer isn't signed in, so it gates rendering.
  const followButton = (
    <Button
      variant={profile.isFollowedByMe ? "secondary" : "primary"}
      loading={followBusy}
      onClick={onFollowToggle}
    >
      {profile.isFollowedByMe ? t("following") : t("follow")}
    </Button>
  );

  // No "plays" stat: PublicUserProfile carries no aggregate play-count field
  // today, so the mock's fourth "12.4k Plays" stat is dropped rather than
  // fabricated (see the T1 plan note).
  const stats: Array<{
    key: string;
    value: number;
    label: string;
    onSelect?: PeopleSubTab;
  }> = [
    { key: "packs", value: packsTotal, label: t("packs") },
    {
      key: "followers",
      value: profile.followerCount,
      label: t("followers"),
      onSelect: "followers",
    },
    {
      key: "following",
      value: profile.followingCount,
      label: t("following"),
      onSelect: "following",
    },
  ];

  return (
    <>
      <div className="mb-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <div className="relative flex-none">
            <Hidden kind="avatar" id={authorId}>
              <AvatarLightbox
                username={profile.username}
                avatarKey={profile.avatarKey}
                // 26px-radius square tile sized to the hero row (not the
                // pill-shaped avatar used everywhere else) — the one
                // deliberate one-off radius per design-tokens.md.
                className="h-[76px] w-[76px] rounded-[26px] border border-border bg-surface text-xl text-foreground-secondary sm:h-24 sm:w-24"
              />
            </Hidden>
            {isOwnProfile && (
              <Link
                href="/profile/edit"
                aria-label={t("editProfile")}
                className="absolute end-[-6px] bottom-[-6px] flex h-[30px] w-[30px] items-center justify-center rounded-full bg-acc text-[#07131a] ring-[3px] ring-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Pencil size={14} strokeWidth={2.5} aria-hidden />
              </Link>
            )}
          </div>

          <div className="min-w-0">
            <Text as="h1" variant="title">
              <Hidden kind="name" id={authorId}>
                <Username
                  username={profile.username}
                  role={profile.role}
                  trusted={profile.trusted}
                  showRole
                  className="text-[30px]"
                />
              </Hidden>
            </Text>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              {stats.map((stat) => {
                const subTab = stat.onSelect;
                return subTab ? (
                  <button
                    key={stat.key}
                    type="button"
                    onClick={() => onSelectPeopleTab?.(subTab)}
                    className={statButtonClass}
                  >
                    <span className={statValueClass}>{stat.value}</span>
                    <span className={statLabelClass}>{stat.label}</span>
                  </button>
                ) : (
                  <div key={stat.key} className={statPairClass}>
                    <span className={statValueClass}>{stat.value}</span>
                    <span className={statLabelClass}>{stat.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {isOwnProfile ? (
          // Your own page is the merged /profile view: manage instead of
          // follow. "Edit profile" stays secondary; "New pack" is new (T1).
          <div className="flex flex-none items-center gap-2">
            <Link
              href="/profile/edit"
              className={buttonClassName("secondary", "w-fit")}
            >
              {t("editProfile")}
            </Link>
            <Link
              href="/create"
              className={buttonClassName("primary", "w-fit")}
            >
              {tHeader("create")}
            </Link>
          </div>
        ) : followBlocked ? null : (
          <div className="flex flex-none flex-col items-end gap-1">
            {followButton}
            {followError && (
              <Text variant="danger" className="text-xs">
                {followError}
              </Text>
            )}
          </div>
        )}
      </div>

      {profile.bio ? (
        <div className="mb-10">
          <Text variant="secondary" className="max-w-[56ch] text-sm">
            {profile.bio}
          </Text>
        </div>
      ) : (
        // Only the owner is nudged to add a bio; a visitor just sees no bio.
        isOwnProfile && (
          <div className="mb-10">
            <Link href="/profile/edit">
              <Text variant="tertiary" className="max-w-[56ch] text-sm italic">
                {t("addBioPrompt")}
              </Text>
            </Link>
          </div>
        )
      )}
    </>
  );
}
