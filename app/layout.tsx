import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { isRtl, type Locale } from "@/src/i18n/config";
import { AuthProvider } from "@/src/shared/lib/auth-context";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";
import { AppHeader } from "@/src/shared/components/AppHeader";
import { BannedBanner } from "@/src/shared/components/BannedBanner";
import { getThemeInitScript } from "@/src/shared/lib/theme";
import { getStreamerModeInitScript } from "@/src/shared/lib/streamer-mode";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base for resolving relative metadata URLs (e.g. per-page `alternates.canonical`)
  // into absolute production URLs. Mirrors robots.ts's SITE_URL fallback; without
  // it Next defaults to http://localhost:3000 and emits localhost canonicals.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://velanto.app",
  ),
  title: {
    default: "Velanto",
    template: "%s | Velanto",
  },
  description:
    "Velanto is an elimination-quiz-pack platform: create packs, play them solo or with others, and see who's left standing.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme-init script (below) sets --acc on this element before
      // hydration, which the server-rendered markup can't know about —
      // an expected mismatch for this pattern, not a real bug.
      suppressHydrationWarning
    >
      <head>
        {/* Applies a stored accent color before first paint, avoiding a
            flash of the default --acc on reload. Not user content — see
            getThemeInitScript's own doc comment for why this is safe. */}
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
        {/* Stamps data-streamer-mode on <html> before first paint so identity
            content is CSS-hidden immediately on reload — see the script's own
            doc comment and the globals.css rule it pairs with. */}
        <script
          dangerouslySetInnerHTML={{ __html: getStreamerModeInitScript() }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <AuthProvider>
            <StreamerModeProvider>
              <AppHeader />
              <BannedBanner />
              {children}
            </StreamerModeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
