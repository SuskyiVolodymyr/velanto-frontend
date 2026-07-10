import Link from "next/link";
import { Text } from "@/src/shared/components/Text";

export default function UserNotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Text as="h1" variant="title" className="mb-2 text-2xl">
        User not found
      </Text>
      <Text variant="secondary" className="mb-6">
        This profile doesn&apos;t exist or has been removed.
      </Text>
      <Link href="/" className="text-acc hover:underline">
        Back to discover
      </Link>
    </div>
  );
}
