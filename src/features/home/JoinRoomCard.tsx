"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RoomIcon } from "@/src/shared/components/icons";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";
import { cn } from "@/src/shared/lib/cn";
import { friendsRoomsClient } from "@/src/features/friends-rooms/friends-rooms-client";
import { ROOMS_DORMANT } from "@/src/features/friends-rooms/room-types";

/** Which inline error to show under the code field. `null` = none. */
type JoinErrorKey =
  | "emptyCode"
  | "errorNotFound"
  | "errorUnavailable"
  | "errorGeneric";

/**
 * The dashboard hero's right column: a translucent panel nested inside
 * DashboardHero's outer gradient card (not a standalone card of its own — the
 * mock merged the promo pitch and this join panel into one `data-el="hero"`
 * section). A real join-by-code entry that drops a signed-in user into a
 * friend's room over any pack (`friendsRoomsClient.join` works for any live
 * room code — it isn't tied to a pack's format). An earlier mock revision
 * showed a friends-avatar-stack + "N friends are playing right now" footer
 * here; that was never shipped (it's live-activity data no endpoint reports,
 * and fabricating a number would be dishonest) and the current mock dropped
 * it too.
 *
 * The code is a user-typed INPUT, not a displayed secret, so no stream-safety
 * concealment applies (that rule is about revealing a code on screen). Signed-
 * out visitors get the anon-gate BLOCK: the field and button are disabled with a
 * sign-in tooltip, never a surprise redirect.
 *
 * While rooms are dormant (`ROOMS_DORMANT`) there is no live room to join, so
 * this renders nothing — the gate lives HERE, before any hook, so the inner
 * card never mounts and never even resolves its `home.joinRoom` strings. One
 * flip of the flag revives it (DashboardHero gates the promo card on the same
 * flag, so the whole hero disappears together, not just this half).
 */
export function JoinRoomCard() {
  if (ROOMS_DORMANT) return null;
  return <JoinRoomCardInner />;
}

function JoinRoomCardInner() {
  const t = useTranslations("home.joinRoom");
  const tEntry = useTranslations("room.entry");
  const router = useRouter();
  const { user } = useAuth();
  const blocked = user === null;

  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<JoinErrorKey | null>(null);

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    if (blocked || joining) return;
    // A code is read aloud or typed from a friend's screen; normalize before
    // sending (the backend normalizes too, but this keeps input forgiving).
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError("emptyCode");
      return;
    }
    setError(null);
    setJoining(true);
    try {
      const room = await friendsRoomsClient.join(normalized);
      // Leave `joining` true — we're navigating away, so the button stays busy
      // rather than flashing back to idle before the route changes.
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      setJoining(false);
      if (err instanceof ApiError && err.status === 404) {
        setError("errorNotFound");
      } else if (err instanceof ApiError && err.status === 409) {
        // Full, already started, or locked — all 409 from the backend.
        setError("errorUnavailable");
      } else {
        setError("errorGeneric");
      }
    }
  }

  const withGate = (node: ReactElement) =>
    blocked ? <Tooltip content={tEntry("signInToPlay")}>{node}</Tooltip> : node;

  return (
    <section className="flex flex-col gap-3 rounded-[16px] border border-white/[0.08] bg-background/[0.55] p-[18px]">
      <div className="flex items-center gap-2.5">
        <RoomIcon size={17} strokeWidth={1.9} className="shrink-0 text-acc" />
        <Text as="h2" className="text-[15px] font-bold">
          {t("title")}
        </Text>
      </div>
      <Text variant="secondary" className="text-pretty text-[13px] leading-[1.5]">
        {t("subtitle")}
      </Text>

      <div className="flex flex-col gap-1.5">
        <form onSubmit={handleJoin} className="flex gap-2.5">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={t("codePlaceholder")}
            aria-label={tEntry("codeLabel")}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            disabled={blocked || joining}
            maxLength={12}
            className={cn(
              "h-[46px] min-w-0 flex-1 rounded-[12px] border border-white/[0.1] bg-background px-3.5 font-mono text-base font-semibold uppercase tracking-[0.18em] text-foreground outline-none transition-colors focus-visible:border-acc disabled:opacity-45",
            )}
          />
          {withGate(
            <Button
              type="submit"
              variant="primary"
              // Gate with aria-disabled, NOT the native `disabled` attribute:
              // `disabled` drops the button from the tab order, so the sign-in
              // Tooltip's focus/hover linkage never fires and a keyboard user
              // can't reach the reason. handleJoin already no-ops when blocked
              // and the input is disabled, so submit stays inert. Mirrors
              // FriendsRoomEntry's anon-gate.
              className={cn(
                "h-[46px] flex-none px-5",
                blocked && "cursor-not-allowed opacity-45",
              )}
              loading={joining}
              aria-disabled={blocked || undefined}
            >
              {tEntry("join")}
            </Button>,
          )}
        </form>
        {error && (
          <Text variant="danger" className="text-xs">
            {tEntry(error)}
          </Text>
        )}
      </div>
    </section>
  );
}
