// Browser-side Sentry init. Runs on the client before hydration. No-op unless
// NEXT_PUBLIC_SENTRY_DSN is set (client env must be public-prefixed to be
// inlined into the browser bundle).
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
    ),
  });
}

// Lets Sentry tie client-side navigations into performance traces.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
