import { describe, expect, it } from "vitest";
import { resolveSentryConfig } from "@/src/shared/lib/sentry-config";

describe("resolveSentryConfig", () => {
  const DSN = "https://key@o1.ingest.de.sentry.io/1";

  it("returns null when no DSN is set (Sentry stays a no-op)", () => {
    expect(resolveSentryConfig({ dsn: undefined })).toBeNull();
    expect(resolveSentryConfig({ dsn: "" })).toBeNull();
  });

  it("is disabled by default in development", () => {
    expect(
      resolveSentryConfig({ dsn: DSN, nodeEnv: "development" })?.enabled,
    ).toBe(false);
    // No environment info at all also falls through to 'development'.
    expect(resolveSentryConfig({ dsn: DSN })?.enabled).toBe(false);
  });

  it("is enabled by default outside development (prod/staging)", () => {
    expect(
      resolveSentryConfig({ dsn: DSN, nodeEnv: "production" })?.enabled,
    ).toBe(true);
    expect(
      resolveSentryConfig({ dsn: DSN, environment: "staging" })?.enabled,
    ).toBe(true);
  });

  it("lets an explicit flag opt in to Sentry in development", () => {
    expect(
      resolveSentryConfig({
        dsn: DSN,
        nodeEnv: "development",
        enabledFlag: "true",
      })?.enabled,
    ).toBe(true);
  });

  it("is disabled when the enabled flag is the string 'false' (any env)", () => {
    expect(
      resolveSentryConfig({
        dsn: DSN,
        nodeEnv: "production",
        enabledFlag: "false",
      })?.enabled,
    ).toBe(false);
  });

  it("uses an explicit environment override", () => {
    expect(
      resolveSentryConfig({ dsn: DSN, environment: "staging" })?.environment,
    ).toBe("staging");
  });

  it("falls back to NODE_ENV when no explicit environment is given", () => {
    expect(
      resolveSentryConfig({ dsn: DSN, nodeEnv: "production" })?.environment,
    ).toBe("production");
  });

  it("falls back to 'development' when nothing is provided", () => {
    expect(resolveSentryConfig({ dsn: DSN })?.environment).toBe("development");
  });

  it("defaults the trace sample rate to 1.0 outside production", () => {
    expect(
      resolveSentryConfig({ dsn: DSN, nodeEnv: "development" })
        ?.tracesSampleRate,
    ).toBe(1);
  });

  it("defaults the trace sample rate to 0.1 in production", () => {
    expect(
      resolveSentryConfig({ dsn: DSN, nodeEnv: "production" })
        ?.tracesSampleRate,
    ).toBe(0.1);
  });

  it("uses an explicit trace sample rate override", () => {
    expect(
      resolveSentryConfig({
        dsn: DSN,
        nodeEnv: "production",
        tracesSampleRate: "0.25",
      })?.tracesSampleRate,
    ).toBe(0.25);
  });

  it("ignores a non-numeric sample-rate override and keeps the default", () => {
    expect(
      resolveSentryConfig({
        dsn: DSN,
        nodeEnv: "production",
        tracesSampleRate: "not-a-number",
      })?.tracesSampleRate,
    ).toBe(0.1);
  });
});
