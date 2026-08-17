"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/ui/Text";
import { Button } from "@/ui/Button";

export default function UserProfileError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useTranslations("pages");
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Text as="h1" variant="title" className="mb-2 text-2xl">
        {t("errorTitle")}
      </Text>
      <Text variant="secondary" className="mb-6">
        {t("errorBody")}
      </Text>
      <Button variant="primary" onClick={() => reset()}>
        {t("tryAgain")}
      </Button>
    </div>
  );
}
