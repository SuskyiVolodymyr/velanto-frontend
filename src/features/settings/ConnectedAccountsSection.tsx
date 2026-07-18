"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import {
  OAuthProviderIcon,
  OAUTH_BRAND_CLASS,
} from "@/src/shared/components/oauth-branding";
import { useAuth } from "@/src/shared/lib/auth-context";
import { authClient, type OAuthProviders } from "@/src/shared/lib/auth-client";
import { cn } from "@/src/shared/lib/cn";
import { SettingsSectionSkeleton } from "@/src/features/settings/SettingsSectionSkeleton";

// Baked in at build time (mirrors OAuthButtons/api-client). Connecting needs a
// top-level navigation to the backend, so the base URL is used directly.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const PROVIDERS = [
  { key: "google", label: "Google" },
  { key: "discord", label: "Discord" },
] as const;

type Provider = (typeof PROVIDERS)[number]["key"];

/**
 * Settings "Connected accounts": shows Google/Discord as connected, or a
 * Connect button that links the provider to the current account — so a user who
 * signed up with one provider can then sign in with the other. Only providers
 * the backend actually has configured (GET /auth/providers) are shown, so the
 * whole section is invisible until OAuth is enabled. Connecting drops the
 * server's one-shot link cookie (authClient.startOAuthLink), then hands off to a
 * top-level OAuth navigation; the backend links and returns to /settings.
 */
export function ConnectedAccountsSection() {
  const t = useTranslations("settings");
  const { status, user } = useAuth();
  const [enabled, setEnabled] = useState<OAuthProviders | null>(null);
  const [pending, setPending] = useState<Provider | null>(null);
  const searchParams = useSearchParams();
  const linkError = searchParams.get("linkError") === "1";

  useEffect(() => {
    let cancelled = false;
    authClient
      .oauthProviders()
      .then((providers) => {
        if (!cancelled) setEnabled(providers);
      })
      .catch(() => {
        if (!cancelled) setEnabled({ google: false, discord: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Only meaningful for a signed-in viewer; hidden entirely until we know which
  // providers are configured and at least one is.
  if (status === "loading") return <SettingsSectionSkeleton />;
  if (status !== "authenticated" || !enabled) return null;
  const visible = PROVIDERS.filter((provider) => enabled[provider.key]);
  if (visible.length === 0) return null;

  const linked = user?.linkedProviders;

  async function connect(provider: Provider) {
    setPending(provider);
    try {
      // Sets the link cookie, then a top-level nav carries it through OAuth.
      await authClient.startOAuthLink(provider);
      window.location.assign(`${API_BASE}/auth/${provider}`);
    } catch {
      // Couldn't arm the link (e.g. session expired) — let the user retry.
      setPending(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        {t("connectedAccountsHeading")}
      </Text>
      <Card className="flex flex-col gap-4 hover:translate-y-0 hover:shadow-none">
        <Text variant="secondary" className="text-sm">
          {t("connectedAccountsDescription")}
        </Text>
        {linkError && (
          <Text variant="danger" role="alert" className="text-sm">
            {t("linkAccountError")}
          </Text>
        )}
        <div className="flex flex-col gap-3">
          {visible.map((provider) => {
            const isLinked = linked?.[provider.key] ?? false;
            return (
              <div
                key={provider.key}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2.5">
                  {/* Discord's mark uses currentColor, so tint it to blurple
                      where it stands on the card (Google's "G" is self-coloured). */}
                  <span
                    className={
                      provider.key === "discord" ? "text-[#5865f2]" : undefined
                    }
                  >
                    <OAuthProviderIcon provider={provider.key} />
                  </span>
                  <Text className="font-medium">{provider.label}</Text>
                </div>
                {isLinked ? (
                  <Text className="text-sm font-medium text-success">
                    {t("providerConnected")}
                  </Text>
                ) : (
                  <button
                    type="button"
                    onClick={() => void connect(provider.key)}
                    disabled={pending !== null}
                    className={cn(
                      "h-9 shrink-0 cursor-pointer rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-60",
                      OAUTH_BRAND_CLASS[provider.key],
                    )}
                  >
                    {t("connectProvider")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
