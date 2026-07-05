import type { Metadata } from "next";
import { Text } from "@/src/shared/components/Text";
import { CreatePackForm } from "@/src/features/create/CreatePackForm";

export const metadata: Metadata = {
  title: "Create a pack",
};

export default function CreatePage() {
  return (
    <main className="flex-1 px-7 py-10">
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        Create a pack
      </Text>
      <Text variant="secondary" className="mb-8 max-w-lg">
        Pick an elimination format and build your rounds. Elements can be text or a YouTube link.
      </Text>
      <CreatePackForm />
    </main>
  );
}
