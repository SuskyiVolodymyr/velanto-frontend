"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { Tooltip } from "@/src/shared/components/Tooltip";
import type { PublicUserProfile } from "@/src/shared/types/user";

/**
 * Floating mini-profile shown when hovering/focusing an author handle: avatar,
 * @handle, follower + pack counts, a truncated bio, and a follow toggle. The
 * whole identity block links to the full profile. This component is purely
 * presentational — the displayed follow state lives in the parent's fetched
 * profile (so it survives this popover unmounting), and the follow *action* is
 * driven through `onFollowToggle`.
 */
export function AuthorHoverCard({
  id,
  authorId,
  profile,
  packsTotal,
  isOwnProfile,
  followBusy,
  followBlocked,
  followError,
  onFollowToggle,
}: {
  id: string;
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
  const isFollowing = profile.isFollowedByMe ?? false;
  const initial = profile.username.slice(0, 1).toUpperCase();

  // Signed-out viewers get a dimmed, non-functional follow button with the
  // reason on hover/focus instead of a surprise sign-in redirect.
  const followButton = (
    <Button
      variant={isFollowing ? "secondary" : "primary"}
      aria-disabled={followBlocked || undefined}
      disabled={followBusy}
      className={followBlocked ? "cursor-not-allowed opacity-45" : undefined}
      onClick={onFollowToggle}
    >
      {isFollowing ? t("following") : t("follow")}
    </Button>
  );

  return (
    <div
      id={id}
      role="dialog"
      aria-label={`@${profile.username}`}
      className="absolute bottom-full left-0 z-20 mb-2 w-[280px] rounded-[14px] border border-border-strong bg-surface p-4 shadow-xl shadow-black/40"
    >
      <Link href={`/users/${authorId}`} className="flex items-center gap-3">
        <Hidden kind="avatar" id={authorId} className="h-11 w-11 flex-none">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-base font-semibold text-foreground-secondary">
            {initial}
          </div>
        </Hidden>
        <div className="min-w-0">
          <Text className="truncate text-[15px] font-semibold">
            <Hidden kind="name" id={authorId}>
              {`@${profile.username}`}
            </Hidden>
          </Text>
          <Text variant="tertiary" className="text-xs">
            {t("followerAndPackCount", {
              followers: profile.followerCount,
              packs: packsTotal,
            })}
          </Text>
        </div>
      </Link>

      {profile.bio && (
        <Text
          variant="secondary"
          className="mt-3 line-clamp-2 text-sm leading-snug"
        >
          {profile.bio}
        </Text>
      )}

      {!isOwnProfile && (
        <div className="mt-3.5 flex flex-col gap-1">
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
  );
}
