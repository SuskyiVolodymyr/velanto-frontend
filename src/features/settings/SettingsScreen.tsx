"use client";

import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { cn } from "@/src/shared/lib/cn";
import { Text } from "@/src/shared/components/Text";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { LanguageSection } from "@/src/features/settings/LanguageSection";
import { AppearanceSection } from "@/src/features/settings/AppearanceSection";
import { PrivacySection } from "@/src/features/settings/PrivacySection";
import { NotificationsSection } from "@/src/features/settings/NotificationsSection";
import { AccountSection } from "@/src/features/settings/AccountSection";
import { PasswordSection } from "@/src/features/settings/PasswordSection";
import { ConnectedAccountsSection } from "@/src/features/settings/ConnectedAccountsSection";
import { ApiTokensPointer } from "@/src/features/settings/ApiTokensPointer";
import { DangerZoneSection } from "@/src/features/settings/DangerZoneSection";
import { pageContainer } from "@/src/shared/lib/page-container";

interface SettingsSectionEntry {
  /** Stable anchor id (T15/D12) — the TOC link's `href` target. */
  id: string;
  label: string;
  Component: ComponentType;
  /**
   * Nothing in this section does anything without an account, so a signed-out
   * visitor doesn't get it at all — neither the section nor its TOC entry.
   *
   * Distinct from the anon-gate rule elsewhere in the app, which blocks a
   * control in place and says why rather than hiding it. That rule is about an
   * action someone reached for and can't complete; these are whole settings for
   * an account that doesn't exist yet, and listing five of them as "log in to
   * manage this" is a page of dead ends rather than an explanation. Language,
   * appearance and privacy DO work signed out (they are local preferences), so
   * the page still has something to be.
   */
  requiresAuth?: true;
}

/**
 * The `SettingsScreen` shell (T15): sticky section TOC + page intro,
 * mirroring the sticky "on this page" nav already shipped on
 * `LegalScreen.tsx` (D12) — same `min-[900px]:sticky min-[900px]:top-6`
 * convention — plus the horizontal `overflow-x-auto no-scrollbar` chip-row
 * collapse below that breakpoint this task's own spec calls for (Legal's own
 * nav doesn't collapse like this; Settings' does).
 *
 * Each of the 9 section components already renders its own root `<section>`
 * (see e.g. `LanguageSection.tsx`), so the stable `id` an anchor needs is
 * added by wrapping the call site here rather than piping an `id` prop
 * through every child component — lower-risk, contained to this one file.
 *
 * TOC labels reuse each section's own existing heading copy (no new i18n
 * keys beyond `settings.intro`, which this task does add) — Privacy's own
 * heading lives under the `streamerMode` namespace (`settingsHeading`,
 * "Privacy"), not `settings`, since `PrivacySection` predates this slice.
 */
export function SettingsScreen() {
  const t = useTranslations("settings");
  const tPrivacy = useTranslations("streamerMode");
  const tPages = useTranslations("pages");

  const { status } = useAuth();
  // Hidden only once auth is KNOWN to be absent. While it resolves the sections
  // stay put and render their own skeletons — that is what those skeletons are
  // for, and dropping five sections out of the page and then putting them back
  // a moment later is a worse jump than a skeleton settling into content.
  const SECTIONS: SettingsSectionEntry[] = [
    {
      id: "language",
      label: t("languageHeading"),
      Component: LanguageSection,
    },
    {
      id: "appearance",
      label: t("appearanceHeading"),
      Component: AppearanceSection,
    },
    {
      id: "connected-accounts",
      requiresAuth: true,
      label: t("connectedAccountsHeading"),
      Component: ConnectedAccountsSection,
    },
    {
      id: "privacy",
      label: tPrivacy("settingsHeading"),
      Component: PrivacySection,
    },
    {
      id: "notifications",
      requiresAuth: true,
      label: t("notificationsHeading"),
      Component: NotificationsSection,
    },
    {
      id: "account",
      requiresAuth: true,
      label: t("accountHeading"),
      Component: AccountSection,
    },
    {
      id: "password",
      requiresAuth: true,
      label: t("passwordHeading"),
      Component: PasswordSection,
    },
    {
      id: "api-tokens",
      label: t("tokensHeading"),
      Component: ApiTokensPointer,
    },
    {
      id: "danger-zone",
      requiresAuth: true,
      label: t("dangerHeading"),
      Component: DangerZoneSection,
    },
  ];

  const sections = SECTIONS.filter(
    (section) => status !== "unauthenticated" || !section.requiresAuth,
  );

  return (
    <>
      <PageHeader
        back={{ href: "/", label: tPages("back") }}
        backFrom={["dashboard", "profile"]}
        crumb={t("title")}
      />
      <main className={cn(pageContainer(1180), "flex-1 py-10")}>
        <div className="mb-10 max-w-[62ch]">
          <Text as="h1" variant="title" className="mb-3 text-3xl">
            {t("title")}
          </Text>
          <Text variant="secondary" className="text-base leading-relaxed">
            {t("intro")}
          </Text>
        </div>

        <div className="flex flex-col gap-8 min-[900px]:flex-row min-[900px]:items-start">
          <nav
            aria-label={t("title")}
            // top-[87px], not top-6: the page header is sticky at top-0 and
            // 63px tall, so a 24px offset parked the first third of this list
            // underneath it. 63 + 24 keeps the gap that top-6 was reaching for,
            // measured from the header's bottom edge instead of the viewport's.
            className="flex gap-2 overflow-x-auto no-scrollbar pb-1 min-[900px]:w-[216px] min-[900px]:flex-none min-[900px]:sticky min-[900px]:top-[87px] min-[900px]:flex-col min-[900px]:gap-0.5 min-[900px]:overflow-visible min-[900px]:pb-0"
          >
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-pill border border-white/[0.09] bg-surface-card px-3 py-1.5 text-[13px] font-medium text-foreground-secondary transition-colors hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                  "min-[900px]:flex min-[900px]:items-center min-[900px]:gap-2 min-[900px]:rounded-lg min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:px-3 min-[900px]:py-1.5 min-[900px]:hover:bg-white/[0.06]",
                )}
              >
                <span
                  aria-hidden
                  className="hidden h-1.5 w-1.5 flex-none rounded-full bg-white/25 min-[900px]:inline-block"
                />
                {section.label}
              </a>
            ))}
          </nav>

          <div className="flex min-w-0 flex-1 flex-col gap-10">
            {sections.map(({ id, Component }) => (
              <div id={id} key={id}>
                <Component />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
