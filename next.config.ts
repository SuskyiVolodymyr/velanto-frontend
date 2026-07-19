import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
import { securityHeaders } from "./src/shared/lib/security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // sharp is a native module used by the dynamic OG cards (opengraph-image /
  // twitter-image) to transcode WebP media to a PNG next/og can rasterise. Left
  // to Next's default bundling it gets webpack-bundled into the serverless
  // function and its native binary fails to load at runtime — the route 500s in
  // production while working locally. Marking it external stops the bundling and
  // loads it from node_modules, and tracing it into those specific routes makes
  // sure Vercel ships the binary in their lambdas. (velanto-frontend OG fix.)
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/packs/[id]/opengraph-image": [
      "./node_modules/@img/**",
      "./node_modules/sharp/**",
    ],
    "/packs/[id]/twitter-image": [
      "./node_modules/@img/**",
      "./node_modules/sharp/**",
    ],
    "/users/[id]/opengraph-image": [
      "./node_modules/@img/**",
      "./node_modules/sharp/**",
    ],
    "/users/[id]/twitter-image": [
      "./node_modules/@img/**",
      "./node_modules/sharp/**",
    ],
  },
  async headers() {
    // Apply the hardening headers to every route. Kept in one shared list so a
    // test can assert them and they can't silently drift.
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // The report queue and its detail screen moved into the merged moderation
    // panel. Server-side redirects rather than client pages, so an old bookmark
    // or a link in a chat still lands on the right screen without shipping a
    // component to do it.
    //
    // `permanent: false` (307, not 308): a 308 is cached by the browser
    // indefinitely, and "/support" is a plausible future PUBLIC route (customer
    // support), so a staff member who hit it once today could then never reach
    // that page. These are noindex staff URLs, so there's no SEO reason to want
    // the permanent one.
    return [
      { source: "/support", destination: "/moderation", permanent: false },
      {
        source: "/support/:id",
        destination: "/moderation/reports/:id",
        permanent: false,
      },
    ];
  },
};

const config = withNextIntl(nextConfig);

// Only wrap with Sentry's build plugin when a DSN is configured, so the default
// build (CI/dev without Sentry env) is byte-for-byte unaffected and can't be
// broken by the plugin. Source maps upload only when SENTRY_ORG / SENTRY_PROJECT
// / SENTRY_AUTH_TOKEN are also present (set in the production build env).
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
    })
  : config;
