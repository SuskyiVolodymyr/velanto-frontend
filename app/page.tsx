import { Text } from "@/src/shared/components/Text";
import { HomeFeed } from "@/src/features/home/HomeFeed";

export default function Home() {
  return (
    <main className="flex-1 px-7 py-10">
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        Discover packs
      </Text>
      <Text variant="secondary" className="mb-8 max-w-lg">
        Browse packs by format or tag, then play through one to see who&apos;s left standing.
      </Text>
      <HomeFeed />
    </main>
  );
}
