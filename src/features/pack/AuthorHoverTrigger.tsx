"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { useStreamerModeOrDefault } from "@/src/shared/lib/streamer-mode-context";
import { useFollowMutation } from "@/src/shared/api/follow.mutations";
import { cn } from "@/src/shared/lib/cn";
import {
  usePackAuthor,
  packAuthorQueryOptions,
} from "./api/pack-author.queries";
import { AuthorHoverCard } from "./AuthorHoverCard";
import type { PackAuthor } from "./api/pack-author";

/** ARIA wiring for the trigger element that owns the hover card. */
export interface AuthorTriggerProps {
  "aria-haspopup"?: "dialog";
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
}

export interface AuthorHoverState {
  /** The fetched author summary, or `undefined` until it resolves / on error. */
  summary: PackAuthor | undefined;
  /** Spread onto the interactive trigger element (a link/button). */
  triggerProps: AuthorTriggerProps;
}

/**
 * Shared machinery for an author @handle that reveals a {@link AuthorHoverCard}
 * mini-profile on hover/focus: fetches the author (client-side, so the follow
 * state is the viewer's own), owns the open/close state, wires ARIA, and drives
 * the follow toggle through the shared cache-patching mutation. The call site
 * supplies its own trigger visual via `children` (a render prop) so the card
 * strip and the hero banner can look different while sharing this behaviour.
 *
 * The card is suppressed in streamer mode and until the author resolves; follow
 * state lives in the query cache (not the popover) so it survives the card
 * unmounting on every hover-out.
 */
export function AuthorHoverTrigger({
  authorId,
  className,
  children,
}: {
  authorId: string;
  /** Extra classes for the relative wrapper (e.g. width/flex). */
  className?: string;
  children: (state: AuthorHoverState) => ReactNode;
}) {
  const tProfile = useTranslations("profile");
  const { user } = useAuth();
  const { enabled: streamerEnabled } = useStreamerModeOrDefault();
  const cardId = useId();

  const { data: summary } = usePackAuthor(authorId);
  const follow = useFollowMutation<PackAuthor>(
    authorId,
    packAuthorQueryOptions(authorId).queryKey,
  );

  const isOwnProfile = user?.id === authorId;
  const [open, setOpen] = useState(false);
  const showCard = open && !streamerEnabled && summary !== undefined;

  const triggerProps: AuthorTriggerProps = {
    "aria-haspopup": summary ? "dialog" : undefined,
    "aria-expanded": summary ? showCard : undefined,
    "aria-controls": summary ? cardId : undefined,
  };

  return (
    <div
      className={cn("relative", className)}
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
      {children({ summary, triggerProps })}

      {showCard && summary && (
        <AuthorHoverCard
          id={cardId}
          authorId={authorId}
          profile={summary.profile}
          packsTotal={summary.packsTotal}
          isOwnProfile={isOwnProfile}
          followBusy={follow.isPending}
          followBlocked={follow.blocked}
          followError={follow.isError ? tProfile("followError") : ""}
          onFollowToggle={() =>
            follow.toggle(summary.profile.isFollowedByMe ?? false)
          }
        />
      )}
    </div>
  );
}
