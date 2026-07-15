"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";

// App-wide error boundary: catches a render/runtime error anywhere under the
// root layout that no closer error boundary handled, so the user sees a
// recoverable screen instead of a blank page. `reset()` re-renders the segment.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest ties this to the server-side log entry; surfacing it in the
    // console is enough for a client-only report without a logging service.
    console.error(error);
  }, [error]);

  const t = useTranslations("pages");
  return (
    <div className="mx-auto max-w-md flex-1 py-16 text-center">
      <Text as="h1" variant="title" className="mb-2 text-2xl">
        {t("errorTitle")}
      </Text>
      <Text variant="secondary" className="mb-6">
        {t("appErrorBody")}
      </Text>
      <Button variant="primary" onClick={() => reset()}>
        {t("tryAgain")}
      </Button>
    </div>
  );
}
