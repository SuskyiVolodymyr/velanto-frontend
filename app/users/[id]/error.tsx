"use client";

import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";

export default function UserProfileError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Text as="h1" variant="title" className="mb-2 text-2xl">
        Something went wrong
      </Text>
      <Text variant="secondary" className="mb-6">
        We couldn&apos;t load this profile. Please try again.
      </Text>
      <Button variant="primary" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
