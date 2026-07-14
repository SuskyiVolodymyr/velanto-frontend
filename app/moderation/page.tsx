import type { Metadata } from "next";
import { Suspense } from "react";
import { ModerationPanel } from "@/src/features/moderation/ModerationPanel";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};

export default function ModerationPage() {
  // The panel reads its active tab from the query string, and useSearchParams
  // opts a component out of static rendering unless it sits under a Suspense
  // boundary — Next fails the build otherwise.
  return (
    <Suspense>
      <ModerationPanel />
    </Suspense>
  );
}
