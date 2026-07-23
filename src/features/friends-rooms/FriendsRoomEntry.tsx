"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users, Ticket } from "lucide-react";
import { Button } from "@/src/shared/components/Button";
import { Modal } from "@/src/shared/components/Modal";
import { Text } from "@/src/shared/components/Text";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";
import { cn } from "@/src/shared/lib/cn";
import { friendsRoomsClient } from "./friends-rooms-client";

/** Which inline error to show under the join form. `null` = none. */
type JoinErrorKey =
  | "emptyCode"
  | "errorNotFound"
  | "errorUnavailable"
  | "errorGeneric";

/**
 * The play entry points for a `save_one_friends` pack, shown on the pack detail
 * page in place of the single-player Play button. Two registered-users-only
 * actions:
 *
 *  - **Create room** opens a fresh room over this pack and routes the host to it.
 *  - **Join by code** opens a modal to enter a friend's room code and routes in.
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

  const [joinOpen, setJoinOpen] = useState(false);
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

  function openJoin() {
    if (blocked) return;
    setJoinError(null);
    setJoinOpen(true);
  }

  function closeJoin() {
    setJoinOpen(false);
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    if (joining) return;
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3.5">
        {withGate(
          <Button
            onClick={handleCreate}
            loading={creating}
            aria-disabled={blocked || undefined}
            className={cn("gap-2.5", blocked && "cursor-not-allowed opacity-45")}
          >
            <Users size={16} aria-hidden />
            {t("entry.createRoom")}
          </Button>,
        )}
        {withGate(
          <Button
            variant="secondary"
            onClick={openJoin}
            aria-disabled={blocked || undefined}
            className={cn("gap-2.5", blocked && "cursor-not-allowed opacity-45")}
          >
            <Ticket size={16} aria-hidden />
            {t("entry.joinByCode")}
          </Button>,
        )}
      </div>

      {createFailed && (
        <Text variant="danger" className="text-sm">
          {t("entry.createError")}
        </Text>
      )}

      <Modal
        open={joinOpen}
        onClose={closeJoin}
        title={t("entry.joinTitle")}
      >
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <Text variant="secondary" className="text-sm">
              {t("entry.codeLabel")}
            </Text>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("entry.codePlaceholder")}
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={joining}
              className="rounded-[10px] border border-border bg-surface px-3.5 py-3 text-sm uppercase tracking-[0.2em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45"
            />
          </label>
          {joinError && (
            <Text variant="danger" className="text-sm">
              {t(`entry.${joinError}`)}
            </Text>
          )}
          <Button type="submit" loading={joining} className="self-end">
            {t("entry.join")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
