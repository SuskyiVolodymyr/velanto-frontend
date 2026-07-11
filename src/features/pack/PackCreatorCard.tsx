"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Hidden } from "@/src/shared/components/Hidden";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useStreamerModeOrDefault } from "@/src/shared/lib/streamer-mode-context";
import { useClientData } from "@/src/shared/hooks/useClientData";
import { useFollowAction } from "@/src/shared/hooks/useFollowAction";
import { usersClient } from "@/src/shared/lib/users-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { AuthorHoverCard } from "./AuthorHoverCard";
import type { Pack } from "@/src/shared/types/pack";
import type { PublicUserProfile } from "@/src/shared/types/user";

interface AuthorSummary {
  profile: PublicUserProfile;
  /** The author's total (approved) pack count — for the hover card's stat line. */
  packsTotal: number;
}

// Deterministic date formatting (fixed locale) so the server and the client
// fallback render identical markup and don't trip a hydration mismatch.
function formatPublished(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Creator strip on the pack page: the author's @handle + published date,
 * linking to their profile. Hovering (or focusing) the strip reveals a
 * {@link AuthorHoverCard} mini-profile with counts, bio, and a follow toggle.
 * The author's identity is fetched client-side (so the follow state is the
 * viewer's own); until it resolves — or if it fails — the strip degrades to a
 * plain "view author" link. In streamer mode the hover card is suppressed and
 * the handle is redacted, leaving just the link.
 *
 * Follow state lives in the fetched `summary` (updated via `setData`) rather
 * than inside the popover, so it survives the popover unmounting on every
 * hover-out.
 */
export function PackCreatorCard({ pack }: { pack: Pack }) {
  const t = useTranslations("pack");
  const { user } = useAuth();
  const { enabled: streamerEnabled } = useStreamerModeOrDefault();
  const published = formatPublished(pack.createdAt);
  const cardId = useId();

  const authorQuery = useClientData<AuthorSummary>(
    async () => {
      const [profile, packs] = await Promise.all([
        usersClient.getProfile(pack.authorId),
        packsClient.list({ authorId: pack.authorId, limit: 1 }),
      ]);
      return { profile, packsTotal: packs.total };
    },
    [pack.authorId],
  );

  const follow = useFollowAction(pack.authorId, (result, nowFollowing) =>
    authorQuery.setData((prev) =>
      prev
        ? {
            ...prev,
            profile: {
              ...prev.profile,
              isFollowedByMe: nowFollowing,
              followerCount: result.followerCount,
            },
          }
        : prev,
    ),
  );

  const summary = authorQuery.data;
  const isOwnProfile = user?.id === pack.authorId;
  const [open, setOpen] = useState(false);
  const showCard = open && !streamerEnabled && summary !== null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) setOpen(false);
      }}
    >
      <Link
        href={`/users/${pack.authorId}`}
        aria-haspopup={summary ? "dialog" : undefined}
        aria-expanded={summary ? showCard : undefined}
        aria-controls={summary ? cardId : undefined}
        className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-white/[0.02] px-[22px] py-5 transition-colors hover:border-border-strong"
      >
        <div className="flex items-center gap-3.5">
          {summary ? (
            <Hidden
              kind="avatar"
              id={pack.authorId}
              className="h-11 w-11 flex-none"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-border bg-surface text-base font-semibold text-foreground-secondary">
                {summary.profile.username.slice(0, 1).toUpperCase()}
              </div>
            </Hidden>
          ) : (
            <span
              aria-hidden
              className="h-11 w-11 flex-none rounded-[12px] border border-white/[0.12]"
              style={{
                background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
              }}
            />
          )}
          <div>
            <Text className="text-[15px] font-semibold">
              {summary ? (
                <Hidden kind="name" id={pack.authorId}>
                  {`@${summary.profile.username}`}
                </Hidden>
              ) : (
                t("viewAuthor")
              )}
            </Text>
            {published && (
              <Text variant="tertiary" className="mt-0.5 text-xs">
                {t("published", { date: published })}
              </Text>
            )}
          </div>
        </div>
        <span className="rounded-[10px] border border-border bg-white/[0.05] px-[17px] py-2.5 text-sm font-medium text-foreground">
          {t("viewProfile")}
        </span>
      </Link>

      {showCard && (
        <AuthorHoverCard
          id={cardId}
          authorId={pack.authorId}
          profile={summary.profile}
          packsTotal={summary.packsTotal}
          isOwnProfile={isOwnProfile}
          followBusy={follow.busy}
          followError={follow.error}
          onFollowToggle={() =>
            follow.toggle(summary.profile.isFollowedByMe ?? false)
          }
        />
      )}
    </div>
  );
}
