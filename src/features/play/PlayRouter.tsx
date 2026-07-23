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
  switch (format) {
    case "rank_blind":
      return <RankPlayScreen pack={pack} />;
    case "1v1":
      return <HeadToHeadPlayScreen pack={pack} />;
    // save_one_friends is played LIVE IN A ROOM (see FriendsRoomEntry on the
    // pack page), never on the single-player /play path — there is no screen
    // here by design. A stale or shared /play link for such a pack must 404
    // rather than fall through to PlayScreen, which would run the wrong
    // mechanic, render the "" instruction copy, and RECORD a single-player play.
    case "save_one_friends":
      return notFound();
    // The elimination screen — the only formats it has instruction copy for
    // (see play-format-copy.ts).
    case "save_one":
    case "sacrifice_one":
    case "nxn":
      return <PlayScreen pack={pack} />;
    default:
      return noPlayPathFor(format);
  }
}
