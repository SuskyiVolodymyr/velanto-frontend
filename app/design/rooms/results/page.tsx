import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignRoomResultsScreen } from "@/src/features/design-lab/DesignRoomResultsScreen";

/** Internal tooling — see app/design/rooms/between/page.tsx. */
export const metadata: Metadata = {
  title: "Design lab · Room results",
  robots: { index: false, follow: false },
};

export default function DesignRoomResultsPage() {
  // Reachable in development, absent in production. The `robots` metadata above
  // and the `/design/` disallow in app/robots.ts only keep this out of SEARCH
  // RESULTS — that is discovery, not access, and an unlinked route is still an
  // open one to anyone who types the URL. This is an ordinary App Router page,
  // so without the gate it ships in the production bundle.
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignRoomResultsScreen />;
}
