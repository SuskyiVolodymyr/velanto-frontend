"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";

/**
 * A signpost where the API tokens manager used to live. The manager itself moved
 * to the API docs topic, so minting a token sits next to the docs explaining what
 * the scopes mean — but people still look for it in Settings, so leave a pointer
 * rather than a dead end.
 */
export function ApiTokensPointer() {
  const t = useTranslations("settings");

  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        {t("tokensHeading")}
      </Text>

      <Card className="flex flex-col items-start gap-3 hover:translate-y-0 hover:shadow-none">
        <Text variant="secondary" className="text-sm leading-relaxed">
          {t("tokensMovedDescription")}
        </Text>
        <Link
          href="/docs?topic=api"
          className="text-sm font-medium text-acc hover:underline"
        >
          {t("tokensMovedLink")}
        </Link>
      </Card>
    </section>
  );
}
