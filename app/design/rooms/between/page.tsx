import type { Metadata } from "next";
import { DesignRoomBetweenScreen } from "@/src/features/design-lab/DesignRoomBetweenScreen";

/**
 * `/design/*` is the design lab: real screens fed hand-built mock state, so a
 * layout can be reworked without a backend, a pack and a game played to the
 * right beat. Internal tooling — kept out of the index (and out of
 * app/sitemap.ts, which lists its allowed routes explicitly).
 */
export const metadata: Metadata = {
  title: "Design lab · Room between rounds",
  robots: { index: false, follow: false },
};

export default function DesignRoomBetweenPage() {
  return <DesignRoomBetweenScreen />;
}
