"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient, type OAuthProviders } from "@/src/shared/lib/auth-client";
import { Text } from "@/src/shared/components/Text";
import {
  OAuthProviderIcon,
  OAUTH_BRAND_CLASS,
} from "@/src/shared/components/oauth-branding";
import {
  openOAuthPopup,
  type OAuthProvider,
} from "@/src/shared/lib/oauth-popup";
import { useAuth } from "@/src/shared/lib/auth-context";
import { cn } from "@/src/shared/lib/cn";

// Shared shape for both brand buttons; each brand supplies its own colors.
const BUTTON_BASE =
  "flex h-[46px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] text-sm font-medium transition-colors disabled:opacity-60";

/**
 * "Or continue with" Google / Discord on the auth screen. Only renders buttons
 * for providers the backend reports as configured (GET /auth/providers). Each
 * opens the provider in a popup (see openOAuthPopup); on success we revalidate
 * the session and land on the home feed. The card's existing Terms/Privacy
 * notice is the consent — signing up via a provider accepts the same terms.
 */
export function OAuthButtons() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { revalidate } = useAuth();
  const [providers, setProviders] = useState<OAuthProviders | null>(null);
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function signIn(provider: OAuthProvider) {
    setError(null);
    setPending(provider);
    const result = await openOAuthPopup(provider);
    if (result.ok) {
      await revalidate();
      router.push("/");
      return;
    }
    // A closed popup is AMBIGUOUS. The popup posts its result and then closes
    // itself; if that message is lost (an extension, the window closing a beat
    // early) we land here even though the flow completed and the refresh cookie
    // is already set. Treating that as cancellation strands a user who did sign
    // in — the reported "OAuth doesn't log me in" symptom. Ask the server which
    // it was rather than inferring it from the window.
    if (result.error === "closed") {
      const signedIn = await revalidate();
      if (signedIn) {
        router.push("/");
        return;
      }
    }
    setPending(null);
    if (result.error === "blocked") setError(t("oauthPopupBlocked"));
    else if (result.error === "oauth") setError(t("oauthError"));
    // "closed" with no session → the user really did dismiss it; not an error.
  }

  return (
    <div className="mt-4">
      <div className="my-4 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <Text variant="tertiary" className="text-xs">
          {t("orContinueWith")}
        </Text>
        <span className="h-px flex-1 bg-border" />
      </div>
      {error && (
        <Text variant="danger" role="alert" className="mb-2 text-sm">
          {error}
        </Text>
      )}
      <div className="flex flex-col gap-2">
        {providers.google && (
          <button
            type="button"
            onClick={() => void signIn("google")}
            disabled={pending !== null}
            className={cn(BUTTON_BASE, OAUTH_BRAND_CLASS.google)}
          >
            <OAuthProviderIcon provider="google" />
            {t("continueWithGoogle")}
          </button>
        )}
        {providers.discord && (
          <button
            type="button"
            onClick={() => void signIn("discord")}
            disabled={pending !== null}
            className={cn(BUTTON_BASE, OAUTH_BRAND_CLASS.discord)}
          >
            <OAuthProviderIcon provider="discord" />
            {t("continueWithDiscord")}
          </button>
        )}
      </div>
    </div>
  );
}
