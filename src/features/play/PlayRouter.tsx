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
    // UI-EXCLUDED:save_one_friends (velanto-frontend#368)
    // Room-based multiplayer has no play path in this repo yet, and such a pack
    // CAN reach here today: packs are authored over the API
    // (velanto-pack-creator via the MCP), not only through this repo's form. It
    // must not fall through to PlayScreen — that would run the wrong mechanic,
    // render the instruction copy as the literal "play." (the "" key's
    // fallback) and RECORD the play. 404 until velanto-frontend#368 builds the
    // real screen.
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
