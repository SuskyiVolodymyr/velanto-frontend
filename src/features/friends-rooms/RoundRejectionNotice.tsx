"use client";

import { useTranslations } from "next-intl";

/**
 * The one place a rejected round action becomes visible.
 *
 * `cut.rejected`, `pick.rejected`, `vote.rejected`, `ranking.rejected` and
 * `place.rejected` were all reaching `useFriendsRoom`'s state and being
 * rendered by nobody, so every non-Claim failure was silent — you clicked, the
 * server said no, and the board looked identical either way. Claim's own
 * rejection has always been surfaced (RoomRound's too-fast note), which is
 * what made the omission look accidental rather than deferred.
 *
 * Rendered once by RoomRoundBoard rather than five times inside each mode's
 * board: the reason ids overlap almost completely across modes, so one notice
 * and one flat `room.rejection.*` map covers all of them.
 */
export function RoundRejectionNotice({ reason }: { reason: string | null }) {
  const t = useTranslations("room");
  if (!reason) return null;

  return (
    // Plain <p>, not <Text>: the same variant/className colour-precedence
    // gotcha the rest of this feature documents — a variant would beat
    // `text-score` regardless of source order.
    <p role="alert" className="text-xs text-score tracking-[-0.01em]">
      {t(`rejection.${reason}`)}
    </p>
  );
}
