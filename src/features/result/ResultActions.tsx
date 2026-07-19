"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { buttonClassName } from "@/src/shared/components/Button";
import { ShareButton } from "@/src/features/share/ShareButton";
import { readLastPlayId } from "@/src/shared/lib/last-play-storage";
import type { Pack } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

/** Bottom action row shared by both result screens: a "Play again" link plus,
 *  for approved packs, a "Share result" button. Prefers a short `?play=<id>`
 *  link (from this browser's just-recorded play) and falls back to encoding the
 *  picks into `?p=` when the play id isn't known yet. */
export function ResultActions({
  packId,
  status,
  picks,
}: {
  packId: string;
  status: Pack["status"];
  picks: RecordedPick[] | null;
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
    <div className="flex items-center gap-3">
      <Link
        href={`/packs/${packId}/play`}
        className={buttonClassName("primary", "w-fit")}
      >
        {t("playAgain")}
      </Link>
      {status === "approved" && (
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
