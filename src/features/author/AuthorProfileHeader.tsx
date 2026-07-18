"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { Username } from "@/src/shared/components/Username";
import { AvatarLightbox } from "@/src/shared/components/AvatarLightbox";
import type { PublicUserProfile } from "@/src/shared/types/user";
import { FollowListModal } from "./FollowListModal";
import type { FollowListKind } from "./api/follow-list.queries";

// The follower / following counts are buttons that open the list modal; they
// read as inline stat text until hovered.
const countButtonClass =
  "rounded-[4px] transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc";

/**
 * Author identity block: avatar/name/stat line, the follow toggle (hidden on
 * your own page), and the optional bio. Streamer-mode redaction of the avatar
 * and name is preserved via `<Hidden>`. Follow state is owned by the screen —
 * this component only renders it and reports clicks.
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
}: {
  authorId: string;
  profile: PublicUserProfile;
  packsTotal: number;
  isOwnProfile: boolean;
  followBusy: boolean;
  followBlocked: boolean;
  followError: string;
  onFollowToggle: () => void;
}) {
  const t = useTranslations("profile");
  // Which follow list (if any) is open in the modal. Conditionally rendered, so
  // the modal remounts per open and its tab resets to this.
  const [followList, setFollowList] = useState<FollowListKind | null>(null);

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

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Hidden kind="avatar" id={authorId} className="h-16 w-16">
            <AvatarLightbox
              username={profile.username}
              avatarKey={profile.avatarKey}
              className="h-16 w-16 rounded-full border border-border bg-surface text-xl text-foreground-secondary"
            />
          </Hidden>
          <div>
            <Text as="h1" variant="title" className="text-2xl">
              <Hidden kind="name" id={authorId}>
                <Username
                  username={profile.username}
                  role={profile.role}
                  trusted={profile.trusted}
                  showRole
                />
              </Hidden>
            </Text>
            <Text variant="tertiary" className="text-sm">
              <button
                type="button"
                onClick={() => setFollowList("followers")}
                className={countButtonClass}
              >
                {t("followerCount", { count: profile.followerCount })}
              </button>
              {" · "}
              <button
                type="button"
                onClick={() => setFollowList("following")}
                className={countButtonClass}
              >
                {t("followingCount", { count: profile.followingCount })}
              </button>
              {" · "}
              {t("packCount", { count: packsTotal })}
            </Text>
          </div>
        </div>
        {isOwnProfile ? (
          // Your own page is the merged /profile view: manage instead of follow.
          <Link
            href="/profile/edit"
            className={buttonClassName("secondary", "w-fit")}
          >
            {t("editProfile")}
          </Link>
        ) : followBlocked ? null : (
          <div className="flex flex-col items-end gap-1">
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
          <Text variant="secondary">{profile.bio}</Text>
        </div>
      ) : (
        // Only the owner is nudged to add a bio; a visitor just sees no bio.
        isOwnProfile && (
          <div className="mb-10">
            <Link href="/profile/edit">
              <Text variant="tertiary" className="italic">
                {t("addBioPrompt")}
              </Text>
            </Link>
          </div>
        )
      )}

      {followList && (
        <FollowListModal
          authorId={authorId}
          initialTab={followList}
          onClose={() => setFollowList(null)}
        />
      )}
    </>
  );
}
