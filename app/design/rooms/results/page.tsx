import type { Metadata } from "next";
import { DesignRoomResultsScreen } from "@/src/features/design-lab/DesignRoomResultsScreen";

/** Internal tooling — see app/design/rooms/between/page.tsx. */
export const metadata: Metadata = {
  title: "Design lab · Room results",
  robots: { index: false, follow: false },
};

export default function DesignRoomResultsPage() {
  return <DesignRoomResultsScreen />;
}
