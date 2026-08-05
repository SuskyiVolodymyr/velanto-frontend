"use client";

import { SignInGate } from "@/src/shared/components/SignInGate";
import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";
import { cn } from "@/src/shared/lib/cn";
import { friendsRoomsClient } from "./friends-rooms-client";
import { useGuestJoin } from "./use-guest-join";

/** Which inline error to show under the join form. `null` = none. */
type JoinErrorKey =
  "emptyCode" | "errorNotFound" | "errorUnavailable" | "errorGeneric";

/**
 * The room play entry points for a pack: a full-width Create-room button plus
 * an always-visible inline code field + Join button (matches the pack detail
 * mock — no modal).
 *
 *  - **Create room** opens a fresh room over this pack and routes the host to
 *    it. Registered users only: room creation is what bounds the whole abuse
 *    surface, so a signed-out visitor sees it blocked with a sign-in tooltip
 *    (the app's anon-gate pattern — same as the vote and comment controls).
 *  - **Join by code** works signed out. A signed-out visitor gets a nickname
 *    field beside the code and joins as a guest — a friend who was handed a
 *    code should be able to play, and being made to register first is where
 *    those groups fall apart.
 *
 * The room itself runs over the socket once you land on `/rooms/[id]`; these
 * calls are just the REST create/join handshake.
 */
export function FriendsRoomEntry({ packId }: { packId: string }) {
  const t = useTranslations("room");
  const router = useRouter();
  const { user } = useAuth();
  const blocked = user === null;

  const [creating, setCreating] = useState(false);
  const [createFailed, setCreateFailed] = useState(false);

  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<JoinErrorKey | null>(null);
  const guestJoin = useGuestJoin();

  async function handleCreate() {
    if (blocked || creating) return;
    setCreateFailed(false);
    setCreating(true);
    try {
      const room = await friendsRoomsClient.create(packId);
      // Leave `creating` true: we are navigating away, so the button should stay
      // busy rather than flash back to idle before the route changes.
      router.push(`/rooms/${room.id}`);
    } catch {
      setCreateFailed(true);
      setCreating(false);
    }
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    if (joining || guestJoin.joining) return;

    // Signed out: the nickname field is showing, so this is a guest join. The
    // hook owns validation and error mapping for that path.
    if (blocked) {
      const room = await guestJoin.join(code, nickname);
      if (room) router.push(`/rooms/${room.id}`);
      return;
    }

    // A code is read aloud or typed from a friend's screen, so normalize for a
    // clean UX before sending — the backend normalizes too, but this keeps the
    // input forgiving of stray spaces and lowercase.
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setJoinError("emptyCode");
      return;
    }
    setJoinError(null);
    setJoining(true);
    try {
      const room = await friendsRoomsClient.join(normalized);
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      setJoining(false);
      if (err instanceof ApiError && err.status === 404) {
        setJoinError("errorNotFound");
      } else if (err instanceof ApiError && err.status === 409) {
        // Full, already started, or locked — all 409 from the backend.
        setJoinError("errorUnavailable");
      } else {
        setJoinError("errorGeneric");
      }
    }
  }

  // Wrap a blocked control in the sign-in tooltip; leave it bare otherwise.
  const withGate = (node: ReactElement) =>
    blocked ? (
      <SignInGate message={t("entry.signInToPlay")}>{node}</SignInGate>
    ) : (
      node
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 py-0.5">
        <span aria-hidden className="h-px flex-1 bg-border" />
        <Text
          variant="tertiary"
          className="text-[11px] font-bold uppercase tracking-[0.1em]"
        >
          {t("entry.orWithFriends")}
        </Text>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      {withGate(
        <Button
          variant="secondary"
          size="lg"
          onClick={handleCreate}
          loading={creating}
          aria-disabled={blocked || undefined}
          className={cn("w-full gap-2.5 rounded-[13px] text-[14.5px]")}
        >
          <Users size={17} aria-hidden />
          {t("entry.createRoom")}
        </Button>,
      )}

      {createFailed && (
        <Text variant="danger" className="text-sm">
          {t("entry.createError")}
        </Text>
      )}

      {/* NOT gated: joining is the one room action a signed-out visitor can
          take. The nickname field appears alongside the code for them, and is
          absent for a signed-in user, whose username the room already knows. */}
      <form onSubmit={handleJoin} className="flex flex-col gap-2.5">
        {blocked && (
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t("entry.nicknamePlaceholder")}
            aria-label={t("entry.nicknameLabel")}
            disabled={guestJoin.joining}
            maxLength={16}
            autoComplete="nickname"
            className="min-w-0 rounded-[12px] border border-border bg-surface px-3.5 py-2.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45"
          />
        )}
        <div className="flex gap-2.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("entry.codePlaceholder")}
            aria-label={t("entry.codeLabel")}
            disabled={joining || guestJoin.joining}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className={cn(
              "min-w-0 flex-1 rounded-[12px] border border-border bg-surface px-3.5 py-2.5 font-mono text-[15px] font-semibold uppercase tracking-[0.16em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45",
            )}
          />
          <Button
            type="submit"
            variant="secondary"
            loading={joining || guestJoin.joining}
          >
            {t("entry.join")}
          </Button>
        </div>
      </form>
      {blocked && !guestJoin.error && (
        <Text variant="tertiary" className="text-[12.5px]">
          {t("entry.guestHint")}
        </Text>
      )}
      {(joinError ?? guestJoin.error) && (
        <Text variant="danger" className="text-sm">
          {t(`entry.${joinError ?? guestJoin.error}`)}
        </Text>
      )}
    </div>
  );
}
