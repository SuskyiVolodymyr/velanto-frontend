"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { authClient, type OAuthProviders } from "@/src/shared/lib/auth-client";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

// Baked in at build time (mirrors api-client's base). OAuth needs a top-level
// navigation to the backend entry route, not a fetch — so these are plain links,
// and the backend redirects back to the app after setting the session cookie.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Shared shape for both brand buttons; each brand supplies its own colors.
const BUTTON_BASE =
  "flex h-[46px] w-full items-center justify-center gap-2.5 rounded-[10px] text-sm font-medium transition-colors";

// The official four-colour Google "G". aria-hidden — the link text is the label.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

// The Discord mark, drawn in the button's current text colour (white on blurple).
function DiscordIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

/**
 * "Or continue with" Google / Discord on the auth screen. Only renders buttons
 * for providers the backend reports as configured (GET /auth/providers), so a
 * disabled provider never shows a button that would 500. Each button carries its
 * provider's brand colour + logo. The card's existing Terms/Privacy notice is the
 * consent — signing up via a provider accepts the same terms, so no extra checkbox.
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
            className={cn(
              BUTTON_BASE,
              "bg-white text-[#1f1f1f] hover:bg-white/90",
            )}
          >
            <GoogleIcon />
            {t("continueWithGoogle")}
          </a>
        )}
        {providers.discord && (
          <a
            href={`${API_BASE}/auth/discord`}
            className={cn(
              BUTTON_BASE,
              "bg-[#5865f2] text-white hover:bg-[#4752c4]",
            )}
          >
            <DiscordIcon />
            {t("continueWithDiscord")}
          </a>
        )}
      </div>
    </div>
  );
}
