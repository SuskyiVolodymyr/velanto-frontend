"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/ui/Text";

const LINK_CLASS = "text-acc underline hover:no-underline";

/** "By continuing you agree to…" — Terms and Privacy, opened in a new tab. */
export function AuthTermsNote() {
  const t = useTranslations("auth");

  return (
    <Text
      variant="tertiary"
      className="text-center text-xs mt-5 leading-relaxed"
    >
      {t.rich("terms", {
        terms: (chunks) => (
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            {chunks}
          </Link>
        ),
      })}
    </Text>
  );
}
