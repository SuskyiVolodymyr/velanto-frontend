import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignRoomGuessingScreen } from "@/src/features/design-lab/DesignRoomGuessingScreen";

/** Internal tooling — see app/design/rooms/between/page.tsx. */
export const metadata: Metadata = {
  title: "Design lab · Room guessing phase",
  robots: { index: false, follow: false },
};

export default function DesignRoomGuessingPage() {
  // Reachable in development, absent in production. The `robots` metadata above
  // and the `/design/` disallow in app/robots.ts only keep this out of SEARCH
  // RESULTS — that is discovery, not access, and an unlinked route is still an
  // open one to anyone who types the URL. This is an ordinary App Router page,
  // so without the gate it ships in the production bundle.
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignRoomGuessingScreen />;
}
