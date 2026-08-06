import type { Metadata } from "next";
import { DesignRoomGuessingScreen } from "@/src/features/design-lab/DesignRoomGuessingScreen";

/** Internal tooling — see app/design/rooms/between/page.tsx. */
export const metadata: Metadata = {
  title: "Design lab · Room guessing phase",
  robots: { index: false, follow: false },
};

export default function DesignRoomGuessingPage() {
  return <DesignRoomGuessingScreen />;
}
