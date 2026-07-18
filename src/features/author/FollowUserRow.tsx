"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { Username } from "@/src/shared/components/Username";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import type { FollowUser } from "@/src/shared/lib/users-client";
import { useFollowListRowMutation } from "./api/follow-list.queries";

/**
 * One user row in a followers / following list: avatar + @handle (both link to
 * the profile) and, for a signed-in viewer looking at someone else, a follow
 * toggle. `isFollowedByMe` is null for anonymous viewers and for the viewer's
 * own row, and the button is hidden in both cases — so it can never be aimed at
 * yourself.
 */
export function FollowUserRow({
  user,
  onNavigate,
}: {
  user: FollowUser;
  /** Called when the identity link is followed (parent closes the modal). */
  onNavigate?: () => void;
}) {
  const t = useTranslations("profile");
  const mutation = useFollowListRowMutation();
  const isFollowing = user.isFollowedByMe ?? false;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link
        href={`/users/${user.id}`}
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
      >
        <Hidden kind="avatar" id={user.id} className="flex-none">
          <UserAvatar
            username={user.username}
            avatarKey={user.avatarKey}
            className="h-10 w-10 rounded-full border border-border bg-surface text-sm text-foreground-secondary"
          />
        </Hidden>
        <div className="min-w-0 truncate">
          <Hidden kind="name" id={user.id}>
            <Username
              username={user.username}
              role={user.role}
              trusted={user.trusted}
              at
              showRole
            />
          </Hidden>
        </div>
      </Link>

      {user.isFollowedByMe !== null && (
        <Button
          variant={isFollowing ? "secondary" : "primary"}
          loading={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              userId: user.id,
              currentlyFollowing: isFollowing,
            })
          }
          className="flex-none"
        >
          {isFollowing ? t("following") : t("follow")}
        </Button>
      )}
    </div>
  );
}
