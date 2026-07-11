"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { Tooltip } from "@/src/shared/components/Tooltip";
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
  const tAuth = useTranslations("authGate");
  const initial = profile.username.slice(0, 1).toUpperCase();

  // A signed-out viewer sees the follow button dimmed and non-functional, with
  // the reason on hover/focus — not the real `disabled` attribute (which would
  // suppress the Tooltip) and not a surprise sign-in redirect.
  const followButton = (
    <Button
      variant={profile.isFollowedByMe ? "secondary" : "primary"}
      aria-disabled={followBlocked || undefined}
      disabled={followBusy}
      className={followBlocked ? "cursor-not-allowed opacity-45" : undefined}
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
              {t("followerAndPackCount", {
                followers: profile.followerCount,
                packs: packsTotal,
              })}
            </Text>
          </div>
        </div>
        {!isOwnProfile && (
          <div className="flex flex-col items-end gap-1">
            {followBlocked ? (
              <Tooltip content={tAuth("logInToFollow")}>{followButton}</Tooltip>
            ) : (
              followButton
            )}
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
