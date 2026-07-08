import type { Metadata } from "next";
import { SupportScreen } from "@/src/features/support/SupportScreen";

export const metadata: Metadata = {
  title: "Reports",
  robots: { index: false, follow: false },
};

export default function SupportPage() {
  return <SupportScreen />;
}
