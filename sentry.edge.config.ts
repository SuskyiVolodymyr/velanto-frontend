// Edge-runtime Sentry init (middleware / edge routes). Loaded from
// instrumentation.ts. No-op unless SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
  });
}
