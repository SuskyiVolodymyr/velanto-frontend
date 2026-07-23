"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { buttonClassName } from "@/src/shared/components/Button";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { Text } from "@/src/shared/components/Text";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import { friendsRoomsClient } from "./friends-rooms-client";

/** Which inline error state to show. `null` = still working (spinner). */
type JoinLinkError = "notFound" | "unavailable" | "generic";

/**
 * The landing component behind an invite link (`/rooms/join/[code]`). Opening
 * the link is exactly equivalent to typing the code into the "Join by code"
 * modal — it drops the friend straight into the room:
 *
 *  - **Signed out** → redirect to sign-in, preserving the destination via
 *    `?next=`. Rooms are registered-users-only (same as the code modal); after
 *    sign-in {@link AuthForm} returns the friend here and the join proceeds.
 *  - **Signed in** → `join(code)` and route into `/rooms/[id]` on success.
 *
 * Error handling is keyed off `ApiError.status` exactly like the code modal in
 * {@link FriendsRoomEntry}: 404 = unknown code, 409 = full/started/locked. A
 * link-joiner may not know which pack this was, so the error state offers a way
 * back to browse packs rather than back to a pack page. There is no auto-retry.
 */
export function JoinByLink({ code }: { code: string }) {
  const t = useTranslations("room");
  const router = useRouter();
  const { user, status } = useAuth();
  const [error, setError] = useState<JoinLinkError | null>(null);

  // Fire the sign-in redirect / join exactly once per code. join() has a side
  // effect (it claims a seat), and React strict mode double-invokes effects
  // while ordinary re-renders can re-run this — so guard on the code we acted
  // for rather than trusting the effect to run only once.
  const actedFor = useRef<string | null>(null);

  useEffect(() => {
    // Wait for auth to settle. During "loading" `user` is momentarily null even
    // for a signed-in visitor, and acting then would wrongly bounce them to the
    // sign-in screen. (`status` is undefined only under a bare test mock; that
    // falls through to the user check below, matching the literal signed-out
    // contract.)
    if (status === "loading") return;
    if (actedFor.current === code) return;
    actedFor.current = code;

    if (user === null) {
      // Preserve the destination through sign-in: AuthForm reads ?next= and
      // router.replace()s back here once authenticated, where — now signed in —
      // the join fires. sanitizeNextPath permits this internal path.
      const dest = `/rooms/join/${code}`;
      router.replace(`/auth?next=${encodeURIComponent(dest)}`);
      return;
    }

    friendsRoomsClient
      .join(code)
      .then((room) => {
        // replace, NOT push: the code sits in the joiner's address bar. Replacing
        // gets it out of the visible URL promptly and keeps it out of the
        // forward-history entry — stream safety, since the invite link contains
        // the code. (The residual code-in-back-history is acceptable: a code dies
        // when the room locks/starts/ends.)
        router.replace(`/rooms/${room.id}`);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError("notFound");
        } else if (err instanceof ApiError && err.status === 409) {
          // Full, already started, or locked — all 409 from the backend.
          setError("unavailable");
        } else {
          setError("generic");
        }
      });
  }, [code, status, user, router]);

  if (error) {
    return (
      <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Text as="h1" variant="title" className="text-2xl">
            {t(`joinLink.${error}Title`)}
          </Text>
          <Text variant="secondary" className="max-w-sm">
            {t(`joinLink.${error}Body`)}
          </Text>
          <Link href="/" className={buttonClassName("secondary")}>
            {t("joinLink.browse")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(PACK_CONTAINER, "flex-1 py-10")}>
      <LoadingState label={t("joinLink.joining")} showLabel size={28} />
    </div>
  );
}
