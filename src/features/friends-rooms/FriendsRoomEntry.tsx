"use client";

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

/** Which inline error to show under the join form. `null` = none. */
type JoinErrorKey =
  "emptyCode" | "errorNotFound" | "errorUnavailable" | "errorGeneric";

/**
 * The room play entry points for a pack: a full-width Create-room button plus
 * an always-visible inline code field + Join button (matches the pack detail
 * mock — no modal). Two registered-users-only actions:
 *
 *  - **Create room** opens a fresh room over this pack and routes the host to it.
 *  - **Join by code** submits the inline code field and routes into that room.
 *
 * Signed-out visitors see both controls blocked with a sign-in tooltip rather
 * than a surprise redirect (the app's anon-gate pattern — same as the vote and
 * comment controls). The room itself runs over the socket once you land on
 * `/rooms/[id]`; these calls are just the REST create/join handshake.
 */
export function FriendsRoomEntry({ packId }: { packId: string }) {
  const t = useTranslations("room");
  const router = useRouter();
  const { user } = useAuth();
  const blocked = user === null;

  const [creating, setCreating] = useState(false);
  const [createFailed, setCreateFailed] = useState(false);

  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<JoinErrorKey | null>(null);

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
    if (blocked || joining) return;
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
      <Tooltip content={t("entry.signInToPlay")}>{node}</Tooltip>
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
          className={cn(
            "w-full gap-2.5 rounded-[13px] text-[14.5px]",
            blocked && "cursor-not-allowed opacity-45",
          )}
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

      {withGate(
        <form onSubmit={handleJoin} className="flex gap-2.5">
          {/* readOnly, not disabled, while blocked — same reasoning as
              CommentSection's composer: a truly `disabled` field drops out of
              the tab order, so a keyboard-only signed-out visitor could never
              tab to it and discover the sign-in tooltip. */}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("entry.codePlaceholder")}
            aria-label={t("entry.codeLabel")}
            readOnly={blocked}
            disabled={joining}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className={cn(
              "min-w-0 flex-1 rounded-[12px] border border-border bg-surface px-3.5 py-2.5 font-mono text-[15px] font-semibold uppercase tracking-[0.16em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45",
              blocked && "cursor-not-allowed opacity-45",
            )}
          />
          <Button
            type="submit"
            variant="secondary"
            loading={joining}
            aria-disabled={blocked || undefined}
            className={cn(blocked && "cursor-not-allowed opacity-45")}
          >
            {t("entry.join")}
          </Button>
        </form>,
      )}
      {joinError && (
        <Text variant="danger" className="text-sm">
          {t(`entry.${joinError}`)}
        </Text>
      )}
    </div>
  );
}
