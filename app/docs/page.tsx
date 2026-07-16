import type { Metadata } from "next";
import { Suspense } from "react";
import { DocsScreen } from "@/src/features/docs/DocsScreen";

export const metadata: Metadata = {
  title: "Docs",
};

export default function DocsPage() {
  // DocsScreen reads the active topic from the query string, which needs a
  // Suspense boundary for this route to stay statically rendered.
  return (
    <Suspense>
      <DocsScreen />
    </Suspense>
  );
}
