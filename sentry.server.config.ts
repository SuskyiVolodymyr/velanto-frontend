// Server-side Sentry init (Node runtime). Loaded from instrumentation.ts.
// No-op unless SENTRY_DSN is set, so dev/CI/preview run without Sentry.
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
  });
}
