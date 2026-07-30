import { notFound } from "next/navigation";
import type { Pack, PackFormat } from "@/src/shared/types/pack";
import { PlayScreen } from "@/src/features/play/PlayScreen";
import { RankPlayScreen } from "@/src/features/play/RankPlayScreen";
import { HeadToHeadPlayScreen } from "@/src/features/play/HeadToHeadPlayScreen";

/**
 * A format this build has no play path for. `format: never` is the compile-time
 * gate: adding an entry to PACK_FORMATS without giving it a `case` above stops
 * compiling HERE, which is the point — a new format must make a routing
 * decision rather than inherit the elimination screen by default.
 *
 * At RUNTIME this is still reachable, because a pack's format comes from the
 * API and the API can ship a format before this build knows it. 404 rather than
 * fall through to a play screen: playing the wrong mechanic would record a play
 * (anonymous plays count toward pack stats too), which corrupts data.
 */
function noPlayPathFor(format: never): never {
  console.error(`PlayRouter: no play path for pack format "${format}"`);
  notFound();
}

export function PlayRouter({ pack }: { pack: Pack }) {
  const format: PackFormat = pack.format;
  // `key={pack.id}`, on every branch: without it, navigating from one pack's
  // play page straight to a DIFFERENT pack's — of the SAME format, so the
  // switch below returns the SAME component type at the SAME tree position —
  // updates the existing screen in place instead of remounting it. Its
  // `usePlayResume` state (seed, round index, saved-progress decision) is then
  // stuck from the FIRST pack: the new pack's own screen renders with the
  // wrong pack's round content, and reading a genuinely-saved play for pack A
  // as if it belonged to never-played pack B is exactly the resume-choice
  // modal surfacing that mismatch. The key forces React to unmount the old
  // screen and mount a fresh one whenever the pack identity changes, for any
  // format pairing, regardless of how the navigation reached this page.
  switch (format) {
    case "rank_blind":
      return <RankPlayScreen key={pack.id} pack={pack} />;
    case "1v1":
      return <HeadToHeadPlayScreen key={pack.id} pack={pack} />;
    // The elimination screen — the only formats it has instruction copy for
    // (see play-format-copy.ts).
    case "save_one":
    case "sacrifice_one":
    case "nxn":
      return <PlayScreen key={pack.id} pack={pack} />;
    default:
      return noPlayPathFor(format);
  }
}
