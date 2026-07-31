"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/src/shared/components/Button";
import { Hidden } from "@/src/shared/components/Hidden";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Username } from "@/src/shared/components/Username";
import { COVER_TONES } from "@/src/shared/types/pack";
import { HAIRLINE_OVERLAY_STYLE } from "@/src/features/play/candidate-tone";
import { useFollowListRowMutation } from "@/src/features/author/api/follow-list.queries";
import type { FollowUser } from "@/src/shared/lib/users-client";

/**
 * A person tile in the /people directory — deliberately the same shell as
 * {@link PackCard} (same radius, border, surface, hover lift, same 16:10 head
 * over a body) so the two browse surfaces read as one system. The avatar takes
 * the cover's place, centred on a tone-derived gradient.
 *
 * Replaces the thin `divide-y` list the directory used to render. That list
 * was fine as a search result but wrong for browsing: /people now opens on
 * everyone, and a page of 20 hairline rows carries none of the visual weight
 * the pack grid beside it does.
 *
 * `Hidden` wraps both the avatar and the handle: this page is a wall of real
 * identities, which is exactly what streamer mode exists to blank out.
 */
export function PersonCard({ user }: { user: FollowUser }) {
  const t = useTranslations("profile");
  const mutation = useFollowListRowMutation();
  const isFollowing = user.isFollowedByMe ?? false;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-surface-card transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.2,0.7,0.3,1)] hover:-translate-y-[3px] hover:border-white/[0.18]">
      <Link href={`/users/${user.id}`} className="flex flex-1 flex-col">
        <div
          className="relative isolate flex aspect-[16/10] items-center justify-center"
          style={{ background: `linear-gradient(150deg, ${toneForUser(user.id)}, #0b0c0f)` }}
        >
          <div aria-hidden className="absolute inset-0" style={HAIRLINE_OVERLAY_STYLE} />
          <Hidden kind="avatar" id={user.id}>
            <UserAvatar
              username={user.username}
              avatarKey={user.avatarKey}
              className="h-[72px] w-[72px] flex-none rounded-full border border-white/[0.12] bg-surface text-2xl text-foreground-secondary"
            />
          </Hidden>
        </div>

        <div className="flex flex-1 flex-col gap-[7px] p-[14px]">
          <Hidden kind="name" id={user.id}>
            {/* `showRole` is Username's own staff/trusted affordance — the same
                one FollowUserRow uses. No separate badge: role display belongs
                to that component, and two sources would drift. */}
            <Username
              username={user.username}
              role={user.role}
              trusted={user.trusted}
              at
              showRole
              className="truncate text-[15px] font-[650] leading-snug"
            />
          </Hidden>
        </div>
      </Link>

      {/* Mirrors PackCard's action strip. `isFollowedByMe` is null for an
          anonymous viewer and for your own row, so the button can never be
          aimed at yourself — same rule as FollowUserRow. */}
      {user.isFollowedByMe !== null && (
        <div className="px-[14px] pb-[14px]">
          <Button
            variant={isFollowing ? "secondary" : "primary"}
            loading={mutation.isPending}
            onClick={() =>
              mutation.mutate({
                userId: user.id,
                currentlyFollowing: isFollowing,
              })
            }
            className="w-full"
          >
            {isFollowing ? t("following") : t("follow")}
          </Button>
        </div>
      )}
    </article>
  );
}

/**
 * A stable gradient tone per user, so a person's tile looks the same on every
 * visit and neighbouring tiles differ. Users have no `coverTone` of their own
 * (that is a pack field), so it is derived from the id — summed char codes
 * rather than the first character alone, which would clump every uuid starting
 * with the same hex digit onto one tone.
 */
function toneForUser(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  return COVER_TONES[sum % COVER_TONES.length];
}

/** Exported for the directory's own tests — not part of the card's contract. */
export const __toneForUser = toneForUser;
