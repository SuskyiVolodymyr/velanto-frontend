/**
 * Pure resolver for Sentry init options, shared by the three runtime configs
 * (browser / Node server / edge). Kept side-effect-free so it can be unit tested
 * without touching the Sentry SDK — each config file reads the relevant env vars
 * and passes them in.
 *
 * Behaviour:
 * - No DSN → returns `null`, so the caller skips `Sentry.init` entirely and
 *   Sentry stays a no-op (dev/CI/preview without a DSN are unaffected).
 * - `environment` tags events dev vs prod in one project, so issues can be
 *   filtered by environment in Sentry. Explicit override wins, else `NODE_ENV`,
 *   else `"development"`.
 * - `enabled` defaults on; set the enabled flag to the string `"false"` to
 *   silence Sentry (e.g. in local dev) without removing the DSN.
 * - `tracesSampleRate` defaults to full sampling outside production and 10% in
 *   production, and can be overridden explicitly.
 */

const PROD_TRACES_SAMPLE_RATE = 0.1;
const DEV_TRACES_SAMPLE_RATE = 1;

export interface SentryEnv {
  /** DSN for this runtime (public `NEXT_PUBLIC_SENTRY_DSN` or server `SENTRY_DSN`). */
  dsn?: string;
  /** `"false"` disables Sentry without dropping the DSN; anything else keeps it on. */
  enabledFlag?: string;
  /** Explicit environment tag; overrides `nodeEnv` when set. */
  environment?: string;
  /** `process.env.NODE_ENV`, used as the environment fallback. */
  nodeEnv?: string;
  /** Explicit trace sample rate override (string from env), else defaulted by env. */
  tracesSampleRate?: string;
}

export interface ResolvedSentryConfig {
  dsn: string;
  enabled: boolean;
  environment: string;
  tracesSampleRate: number;
}

function parseRate(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveSentryConfig(
  env: SentryEnv,
): ResolvedSentryConfig | null {
  if (!env.dsn) return null;

  const environment =
    env.environment?.trim() || env.nodeEnv?.trim() || "development";

  const defaultRate =
    environment === "production"
      ? PROD_TRACES_SAMPLE_RATE
      : DEV_TRACES_SAMPLE_RATE;

  return {
    dsn: env.dsn,
    enabled: env.enabledFlag !== "false",
    environment,
    tracesSampleRate: parseRate(env.tracesSampleRate, defaultRate),
  };
}
