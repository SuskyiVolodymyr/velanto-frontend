"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
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
 * Browse-page hero: a real join-by-code entry that drops a signed-in user into a
 * friend's room over any pack (`friendsRoomsClient.join` works for any live
 * room code — it isn't tied to a pack's format). The mock's second, forward-
 * looking "every pack plays with friends" promo is intentionally NOT shipped
 * here — it advertises the not-yet-built multiplayer-for-all, so only the
 * functional join card is real.
 *
 * The code is a user-typed INPUT, not a displayed secret, so no stream-safety
 * concealment applies (that rule is about revealing a code on screen). Signed-
 * out visitors get the anon-gate BLOCK: the field and button are disabled with a
 * sign-in tooltip, never a surprise redirect.
 *
 * While rooms are dormant (`ROOMS_DORMANT`) there is no live room to join, so
 * the hero is not rendered at all — the gate lives HERE, before any hook, so the
 * inner card never mounts and never even resolves its `home.joinRoom` strings.
 * One flip of the flag revives it.
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
    <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-surface-card p-[22px] min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-acc/[0.12] text-acc"
        >
          <KeyRound size={20} strokeWidth={2} />
        </span>
        <div className="flex flex-col gap-1">
          <Text as="h2" className="text-[15px] font-bold">
            {t("title")}
          </Text>
          <Text variant="secondary" className="max-w-sm text-[13px] leading-[1.5]">
            {t("subtitle")}
          </Text>
        </div>
      </div>

      <div className="flex w-full flex-col gap-1.5 min-[560px]:w-auto">
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
              "h-[46px] w-full rounded-[12px] border border-white/[0.1] bg-background px-3.5 font-mono text-base font-semibold uppercase tracking-[0.18em] text-foreground outline-none transition-colors focus-visible:border-acc disabled:opacity-45 min-[560px]:w-[168px]",
            )}
          />
          {withGate(
            <Button
              type="submit"
              variant="secondary"
              // Gate with aria-disabled, NOT the native `disabled` attribute:
              // `disabled` drops the button from the tab order, so the sign-in
              // Tooltip's focus/hover linkage never fires and a keyboard user
              // can't reach the reason. handleJoin already no-ops when blocked
              // and the input is disabled, so submit stays inert. Mirrors
              // FriendsRoomEntry's anon-gate.
              className={cn(
                "h-[46px] flex-none",
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
