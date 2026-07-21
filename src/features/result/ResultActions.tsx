"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonClassName } from "@/src/shared/components/Button";
import { ShareButton } from "@/src/features/share/ShareButton";
import { readLastPlayId } from "@/src/shared/lib/last-play-storage";
import { cn } from "@/src/shared/lib/cn";
import type { Pack } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

/** Action row shared by the result screens: a link into the pack plus, for
 *  approved packs, a "Share result" button. Prefers a short `?play=<id>` link
 *  (from this browser's just-recorded play) and falls back to encoding the
 *  picks into `?p=` when the play id isn't known yet.
 *
 *  On a SHARED result the link reads "Try it yourself" instead of "Play again":
 *  the reader is looking at someone else's run and has not played at all, so
 *  "again" was telling them to repeat something they never did. */
export function ResultActions({
  packId,
  status,
  picks,
  shared = false,
  className,
}: {
  packId: string;
  status: Pack["status"];
  picks: RecordedPick[] | null;
  shared?: boolean;
  className?: string;
}) {
  const t = useTranslations("result");
  // The play id is written after the record request resolves (post-mount), so
  // read it after mount too. Falls back to the ?p= payload until it's known.
  const [playId, setPlayId] = useState<string | null>(null);
  useEffect(() => {
    // Mounted read of a client-only value (sessionStorage), not a fetch — the
    // canonical safe shape here (same as useResultPicks' own read).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayId(readLastPlayId(packId));
  }, [packId]);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Link
        href={`/packs/${packId}/play`}
        className={buttonClassName("primary", "w-fit")}
      >
        {shared ? t("tryItYourself") : t("playAgain")}
      </Link>
      {/* No Share on a shared result: the picks on screen are someone else's,
          so the only thing there is to share is the link the reader arrived
          on — offering it back invites passing off another player's run. */}
      {status === "approved" && !shared && (
        <ShareButton
          path={`/packs/${packId}/result`}
          picks={picks}
          playId={playId}
          label={t("shareResult")}
        />
      )}
    </div>
  );
}
