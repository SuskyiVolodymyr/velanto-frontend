import type { Metadata } from "next";
import { MobileAccountScreen } from "@/src/features/account/MobileAccountScreen";

// Staff-agnostic account hub reached from the phone bottom nav's Profile tab.
// noindex: it's a personal, auth-gated hub, not a public page.
export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <MobileAccountScreen />;
}
