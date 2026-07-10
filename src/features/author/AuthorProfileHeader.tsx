"use client";

import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import type { PublicUserProfile } from "@/src/shared/types/user";

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
  followError,
  onFollowToggle,
}: {
  authorId: string;
  profile: PublicUserProfile;
  packsTotal: number;
  isOwnProfile: boolean;
  followBusy: boolean;
  followError: string;
  onFollowToggle: () => void;
}) {
  const initial = profile.username.slice(0, 1).toUpperCase();

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Hidden kind="avatar" id={authorId} className="h-16 w-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-xl font-semibold text-foreground-secondary">
              {initial}
            </div>
          </Hidden>
          <div>
            <Text as="h1" variant="title" className="text-2xl">
              <Hidden kind="name" id={authorId}>
                {profile.username}
              </Hidden>
            </Text>
            <Text variant="tertiary" className="text-sm">
              {profile.followerCount} follower
              {profile.followerCount === 1 ? "" : "s"} · {packsTotal} pack
              {packsTotal === 1 ? "" : "s"}
            </Text>
          </div>
        </div>
        {!isOwnProfile && (
          <div className="flex flex-col items-end gap-1">
            <Button
              variant={profile.isFollowedByMe ? "secondary" : "primary"}
              disabled={followBusy}
              onClick={onFollowToggle}
            >
              {profile.isFollowedByMe ? "Following" : "Follow"}
            </Button>
            {followError && (
              <Text className="text-xs text-[#ff6b6b]">{followError}</Text>
            )}
          </div>
        )}
      </div>

      {profile.bio && (
        <div className="mb-10">
          <Text variant="secondary">{profile.bio}</Text>
        </div>
      )}
    </>
  );
}
