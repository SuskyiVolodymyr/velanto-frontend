// Next.js instrumentation hook. Loads the runtime-appropriate Sentry config and
// forwards nested React Server Component / route errors to Sentry (no-op unless
// a DSN is configured inside those config files).
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
