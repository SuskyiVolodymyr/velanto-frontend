import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  // Reachable in development, absent in production. The `robots` metadata above
  // and the `/design/` disallow in app/robots.ts only keep this out of SEARCH
  // RESULTS — that is discovery, not access, and an unlinked route is still an
  // open one to anyone who types the URL. This is an ordinary App Router page,
  // so without the gate it ships in the production bundle.
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignRoomBetweenScreen />;
}
