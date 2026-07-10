import Link from "next/link";
import { buttonClassName } from "@/src/shared/components/Button";
import { ShareButton } from "@/src/features/share/ShareButton";
import type { Pack } from "@/src/shared/types/pack";
import type { RecordedPick } from "@/src/shared/types/play-results";

/** Bottom action row shared by both result screens: a "Play again" link plus,
 *  for approved packs, a "Share result" button encoding the given picks. */
export function ResultActions({
  packId,
  status,
  picks,
}: {
  packId: string;
  status: Pack["status"];
  picks: RecordedPick[] | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/packs/${packId}/play`}
        className={buttonClassName("primary", "w-fit")}
      >
        Play again
      </Link>
      {status === "approved" && (
        <ShareButton
          path={`/packs/${packId}/result`}
          picks={picks}
          label="Share result"
        />
      )}
    </div>
  );
}
