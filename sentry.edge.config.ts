// Edge-runtime Sentry init (middleware / edge routes). Loaded from
// instrumentation.ts. No-op unless SENTRY_DSN is set. Shares the resolver with
// the client/server configs so environment tagging, the enable toggle, and
// sample rates stay consistent.
import * as Sentry from "@sentry/nextjs";
import { resolveSentryConfig } from "@/src/shared/lib/sentry-config";

const config = resolveSentryConfig({
  dsn: process.env.SENTRY_DSN,
  enabledFlag: process.env.SENTRY_ENABLED,
  environment: process.env.SENTRY_ENVIRONMENT,
  nodeEnv: process.env.NODE_ENV,
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE,
});

if (config) {
  Sentry.init({
    dsn: config.dsn,
    enabled: config.enabled,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
  });
}
