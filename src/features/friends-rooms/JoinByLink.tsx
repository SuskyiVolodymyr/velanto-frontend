"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, buttonClassName } from "@/src/shared/components/Button";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { Text } from "@/src/shared/components/Text";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";
import { pageContainer } from "@/src/shared/lib/page-container";
import { cn } from "@/src/shared/lib/cn";
import { friendsRoomsClient } from "./friends-rooms-client";
import { ROOMS_DORMANT } from "./room-types";
import { useGuestJoin } from "./use-guest-join";

/** Which inline error state to show. `null` = still working (spinner). */
type JoinLinkError = "notFound" | "unavailable" | "generic";

/**
 * The landing component behind an invite link (`/rooms/join/[code]`). Opening
 * the link is exactly equivalent to typing the code into the join field on the
 * pack page:
 *
 *  - **Signed in** → `join(code)` and route into `/rooms/[id]` on success.
 *  - **Signed out** → ask for a nickname and join as a guest. Deliberately NOT
 *    a redirect to sign-in: someone who was handed an invite link is being
 *    invited to a game their friends are already in, and a registration wall at
 *    that exact moment is where the group falls apart. They can still sign in
 *    from the same screen if they'd rather have an account.
 *
 * Error handling is keyed off `ApiError.status` exactly like the pack-page form:
 * 404 = unknown code, 409 = full/started/locked. A link-joiner may not know
 * which pack this was, so the error state offers a way back to browse packs
 * rather than back to a pack page. There is no auto-retry.
 */
export function JoinByLink({ code }: { code: string }) {
  const t = useTranslations("room");
  const router = useRouter();
  const { user, status } = useAuth();
  const guestJoin = useGuestJoin();
  const [nickname, setNickname] = useState("");
  // While rooms are dormant no invite code can resolve, so land straight on the
  // graceful "not found" + browse state — never prompt a visitor for a nickname
  // only to reach a guaranteed 404. Seeded here (not via the effect) so there
  // is no spinner flash and no doomed join. Revives with one flip of
  // ROOMS_DORMANT.
  const [error, setError] = useState<JoinLinkError | null>(
    ROOMS_DORMANT ? "notFound" : null,
  );

  // Fire the join exactly once per code. join() has a side effect (it claims a
  // seat), and React strict mode double-invokes effects while ordinary
  // re-renders can re-run this — so guard on the code we acted for rather than
  // trusting the effect to run only once.
  const actedFor = useRef<string | null>(null);

  useEffect(() => {
    // Rooms dormant — the initial state above is already the graceful dead-end.
    if (ROOMS_DORMANT) return;
    // Wait for auth to settle. During "loading" `user` is momentarily null even
    // for a signed-in visitor, and acting then would show them the guest form.
    // (`status` is undefined only under a bare test mock; that falls through to
    // the user check below, matching the literal signed-out contract.)
    if (status === "loading") return;
    // Signed out: nothing automatic to do. The form below takes over, and the
    // guard stays unset so signing in still triggers the join on return.
    if (user === null) return;
    if (actedFor.current === code) return;
    actedFor.current = code;

    friendsRoomsClient
      .join(code)
      .then((room) => {
        // replace, NOT push: the code sits in the joiner's address bar.
        // Replacing gets it out of the visible URL promptly and keeps it out of
        // the forward-history entry — stream safety, since the invite link
        // contains the code. (The residual code-in-back-history is acceptable:
        // a code dies when the room locks/starts/ends.)
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
      <div className={cn(pageContainer(1320), "flex-1 py-10")}>
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

  if (!ROOMS_DORMANT && status !== "loading" && user === null) {
    return (
      <GuestJoinForm
        code={code}
        nickname={nickname}
        onNicknameChange={setNickname}
        joining={guestJoin.joining}
        errorKey={guestJoin.error}
        onSubmit={async () => {
          const room = await guestJoin.join(code, nickname);
          if (room) router.replace(`/rooms/${room.id}`);
        }}
      />
    );
  }

  return (
    <div className={cn(pageContainer(1320), "flex-1 py-10")}>
      <LoadingState label={t("joinLink.joining")} showLabel size={28} />
    </div>
  );
}

/**
 * The signed-out landing: one field and a button. Kept in this file rather than
 * shared with the pack page's form because the two are shaped for different
 * places — this one is a whole page and already knows its code, that one is a
 * strip in a sidebar and has to ask for one.
 */
function GuestJoinForm({
  code,
  nickname,
  onNicknameChange,
  joining,
  errorKey,
  onSubmit,
}: {
  code: string;
  nickname: string;
  onNicknameChange: (value: string) => void;
  joining: boolean;
  errorKey: string | null;
  onSubmit: () => void;
}) {
  const t = useTranslations("room");

  return (
    <div className={cn(pageContainer(1320), "flex-1 py-10")}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-16 text-center"
      >
        <Text as="h1" variant="title" className="text-2xl">
          {t("joinLink.guestTitle")}
        </Text>
        <Text variant="secondary">{t("joinLink.guestBody")}</Text>
        <input
          value={nickname}
          onChange={(event) => onNicknameChange(event.target.value)}
          placeholder={t("entry.nicknamePlaceholder")}
          aria-label={t("entry.nicknameLabel")}
          disabled={joining}
          maxLength={16}
          autoComplete="nickname"
          autoFocus
          className="w-full rounded-[12px] border border-border bg-surface px-3.5 py-2.5 text-center text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45"
        />
        <Button type="submit" size="lg" loading={joining} className="w-full">
          {t("entry.join")}
        </Button>
        {errorKey && (
          <Text variant="danger" className="text-sm">
            {t(`entry.${errorKey}`)}
          </Text>
        )}
        {/* An account is still on offer, just not as a toll gate. `next=`
            brings them back here, where — now signed in — the effect joins. */}
        <Link
          href={`/auth?next=${encodeURIComponent(`/rooms/join/${code}`)}`}
          className="text-[13px] text-muted underline-offset-2 hover:underline"
        >
          {t("joinLink.guestSignIn")}
        </Link>
      </form>
    </div>
  );
}
