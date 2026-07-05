import { Badge } from "@/src/shared/components/Badge";
import { Text } from "@/src/shared/components/Text";

/**
 * Placeholder root page — infra scaffolding only (see issue #1). Real Home
 * screen content is separate future work per screen-inventory.md; this just
 * proves the shared primitives / design tokens are wired up end to end.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <Badge variant="accent">Velanto</Badge>
      <Text as="h1" variant="title" className="text-3xl">
        Scaffolding in progress
      </Text>
      <Text variant="secondary" className="max-w-md">
        Product screens land in follow-up work. This page only confirms the
        app shell, design tokens, and shared primitives are wired up.
      </Text>
    </main>
  );
}
