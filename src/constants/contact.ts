/**
 * The platform's only contact address. One person reads it.
 *
 * ⚠️ This constant is NOT the single source of truth, and cannot be: the same
 * address is written inline into the `terms` and `privacy` prose in all 8
 * message catalogs, because it appears mid-sentence in translated text and
 * next-intl interpolation would make those strings harder to translate, not
 * easier. If this address ever changes, grep `messages/*.json` too —
 * `src/i18n/catalogs.test.ts` will not catch a stale one.
 *
 * Receiving is a Cloudflare Email Routing rule (forward-only); sending as this
 * address goes through AWS SES. See project_domain_email.
 */
export const SUPPORT_EMAIL = "support@playvelanto.com";
