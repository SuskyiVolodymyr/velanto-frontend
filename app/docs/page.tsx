import type { Metadata } from "next";
import { DocsScreen } from "@/src/features/docs/DocsScreen";

export const metadata: Metadata = {
  title: "Docs",
};

export default function DocsPage() {
  return <DocsScreen />;
}
