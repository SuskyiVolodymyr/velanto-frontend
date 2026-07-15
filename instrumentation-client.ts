// Browser-side Sentry init. Runs on the client before hydration. No-op unless
// NEXT_PUBLIC_SENTRY_DSN is set (client env must be public-prefixed to be
// inlined into the browser bundle). Options come from the shared resolver so
// dev/prod tagging, the enable toggle, and sample rates behave identically
// across the client/server/edge runtimes.
import * as Sentry from "@sentry/nextjs";
import { resolveSentryConfig } from "@/src/shared/lib/sentry-config";

const config = resolveSentryConfig({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabledFlag: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  nodeEnv: process.env.NODE_ENV,
  tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
});

if (config) {
  Sentry.init({
    dsn: config.dsn,
    enabled: config.enabled,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
  });
}

// Lets Sentry tie client-side navigations into performance traces.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
