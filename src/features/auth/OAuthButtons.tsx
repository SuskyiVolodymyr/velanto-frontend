"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { authClient, type OAuthProviders } from "@/src/shared/lib/auth-client";
import { buttonClassName } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

// Baked in at build time (mirrors api-client's base). OAuth needs a top-level
// navigation to the backend entry route, not a fetch — so these are plain links,
// and the backend redirects back to the app after setting the session cookie.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * "Or continue with" Google / Discord on the auth screen. Only renders buttons
 * for providers the backend reports as configured (GET /auth/providers), so a
 * disabled provider never shows a button that would 500. The card's existing
 * Terms/Privacy notice is the consent — signing up via a provider accepts the
 * same terms, so no extra checkbox.
 */
export function OAuthButtons() {
  const t = useTranslations("auth");
  const [providers, setProviders] = useState<OAuthProviders | null>(null);

  useEffect(() => {
    let cancelled = false;
    authClient
      .oauthProviders()
      .then((p) => {
        if (!cancelled) setProviders(p);
      })
      .catch(() => {
        if (!cancelled) setProviders({ google: false, discord: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!providers || (!providers.google && !providers.discord)) return null;

  return (
    <div className="mt-4">
      <div className="my-4 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <Text variant="tertiary" className="text-xs">
          {t("orContinueWith")}
        </Text>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-2">
        {providers.google && (
          <a
            href={`${API_BASE}/auth/google`}
            className={cn(buttonClassName("secondary"), "h-[46px] w-full")}
          >
            {t("continueWithGoogle")}
          </a>
        )}
        {providers.discord && (
          <a
            href={`${API_BASE}/auth/discord`}
            className={cn(buttonClassName("secondary"), "h-[46px] w-full")}
          >
            {t("continueWithDiscord")}
          </a>
        )}
      </div>
    </div>
  );
}
