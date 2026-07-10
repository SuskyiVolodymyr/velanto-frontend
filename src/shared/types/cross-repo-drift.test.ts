/**
 * Cross-repo drift check (frontend half of slice X1).
 *
 * This repo and the private `velanto-backend` repo deliberately share NO code or
 * types package (see .claude/docs/coding-conventions.md). Several closed-set
 * wire-contract constants are therefore MIRRORED by hand in both repos. If one
 * repo's list drifts from the other, requests silently break (a value the client
 * sends is rejected by the server, or vice versa) with no compile-time signal.
 *
 * A live diff between a public and a private repo can't run in CI, so instead
 * each repo snapshots its own copy of every mirrored constant to an explicit
 * expected literal below. Changing a mirrored constant makes this test fail,
 * forcing a conscious, reviewed update — and the matching edit in the other
 * repo (its own drift test fails the same way). The snapshot IS the contract.
 *
 * When you intentionally change one of these, update BOTH:
 *   - this file (velanto-frontend), and
 *   - velanto-backend/src/common/cross-repo-drift.spec.ts
 * The "Canonical const homes" table in each repo's root CLAUDE.md lists the
 * home file for every entry below.
 */
import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ROLES } from "@/src/shared/types/user";
import { PACK_FORMATS, PACK_STATUSES, PACK_TAGS } from "@/src/shared/types/pack";
import {
  FEEDBACK_TOPICS,
  FEEDBACK_VISIBILITIES,
  FEEDBACK_STATUSES,
  FEEDBACK_SORTS,
} from "@/src/shared/types/feedback";
import { REPORT_TYPES, REPORT_STATUSES } from "@/src/shared/types/report";
import { REPORT_REASON_LABELS } from "@/src/shared/lib/report-reasons";
import { BAN_REASONS } from "@/src/shared/types/rules";
import { BAN_DURATIONS } from "@/src/shared/lib/ban-durations";
import { NOTIFICATION_TYPES } from "@/src/shared/types/notification";
import { LOCALES, DEFAULT_LOCALE } from "@/src/i18n/config";

describe("cross-repo mirrored constants (velanto-backend contract)", () => {
  // ROLES — MIRRORED in velanto-backend src/modules/users/role.ts (ROLES).
  it("ROLES", () => {
    expect([...ROLES]).toEqual(["user", "moderator", "admin", "manager"]);
  });

  // PACK_FORMATS — MIRRORED in velanto-backend src/modules/packs/types/format.ts
  // (SUPPORTED_FORMATS). Same set; the name differs per repo.
  it("PACK_FORMATS", () => {
    expect([...PACK_FORMATS]).toEqual([
      "save_one",
      "sacrifice_one",
      "nxn",
      "rank_blind",
      "1v1",
    ]);
  });

  // PACK_STATUSES — MIRRORED in velanto-backend
  // src/modules/packs/types/moderation-status.ts (PACK_MODERATION_STATUSES).
  it("PACK_STATUSES", () => {
    expect([...PACK_STATUSES]).toEqual(["pending", "approved", "rejected"]);
  });

  // PACK_TAGS — MIRRORED in velanto-backend src/modules/packs/types/tags.ts.
  it("PACK_TAGS", () => {
    expect([...PACK_TAGS]).toEqual([
      "Anime",
      "Movies",
      "Music",
      "Sports",
      "Football",
      "Basketball",
      "Wrestling",
      "Food",
      "Gaming",
      "Board Games",
      "Comics",
      "Sci-Fi",
      "Fantasy",
      "Horror",
      "TV",
      "Cartoons",
      "Books",
      "Fashion",
      "Cars",
      "History",
      "Mythology",
      "Nature",
      "Animals",
      "Technology",
      "Science",
      "Space",
      "Art",
      "Travel",
      "Celebrities",
      "K-pop",
      "Memes",
    ]);
  });

  // LOCALES — MIRRORED in velanto-backend src/modules/packs/types/language.ts
  // (PACK_LANGUAGES, which also absorbed FEEDBACK_LOCALES).
  it("LOCALES", () => {
    expect([...LOCALES]).toEqual([
      "en",
      "zh",
      "hi",
      "es",
      "fr",
      "ar",
      "bn",
      "pt",
      "ru",
      "ur",
      "uk",
    ]);
  });

  it('DEFAULT_LOCALE is "en" (mirrors BE DEFAULT_PACK_LANGUAGE)', () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  // FEEDBACK_* — MIRRORED in velanto-backend
  // src/modules/feedback/types/feedback.ts.
  it("FEEDBACK_TOPICS", () => {
    expect([...FEEDBACK_TOPICS]).toEqual([
      "bug",
      "feature",
      "translation",
      "other",
    ]);
  });

  it("FEEDBACK_VISIBILITIES", () => {
    expect([...FEEDBACK_VISIBILITIES]).toEqual(["everyone", "staff_only"]);
  });

  it("FEEDBACK_STATUSES", () => {
    expect([...FEEDBACK_STATUSES]).toEqual([
      "new",
      "in_progress",
      "done",
      "declined",
    ]);
  });

  it("FEEDBACK_SORTS", () => {
    expect([...FEEDBACK_SORTS]).toEqual(["new", "top"]);
  });

  // REPORT_TYPES — MIRRORED in velanto-backend
  // src/modules/reports/types/reasons.ts.
  it("REPORT_TYPES", () => {
    expect([...REPORT_TYPES]).toEqual(["pack", "user", "round"]);
  });

  // REPORT_STATUSES — MIRRORED in velanto-backend
  // src/modules/reports/types/status.ts.
  it("REPORT_STATUSES", () => {
    expect([...REPORT_STATUSES]).toEqual(["new", "reviewing", "closed"]);
  });

  // The reason ids per report type — the KEYS of each REPORT_REASON_LABELS
  // record — are MIRRORED in velanto-backend src/modules/reports/types/reasons.ts
  // (REPORT_REASONS). The FE adds display labels on top; only the ids are the
  // wire contract.
  it("REPORT_REASON_LABELS keys (reason ids)", () => {
    const reasonIds = Object.fromEntries(
      REPORT_TYPES.map((type) => [type, Object.keys(REPORT_REASON_LABELS[type])]),
    );
    expect(reasonIds).toEqual({
      pack: ["inappropriate", "copyright", "spam", "other"],
      user: ["harassment", "impersonation", "spam", "other"],
      round: ["wrong_answer", "broken_media", "inappropriate", "other"],
    });
  });

  // BAN_REASONS — MIRRORED in velanto-backend src/modules/rules/types/rules.ts.
  it("BAN_REASONS", () => {
    expect([...BAN_REASONS]).toEqual([
      "hate_discrimination",
      "harassment_bullying",
      "violence_harm",
      "sexual_content",
      "child_safety",
      "illegal_content",
      "privacy_doxxing",
      "impersonation_deception",
      "spam_manipulation",
      "misinformation",
      "intellectual_property",
      "platform_integrity",
      "other",
    ]);
  });

  // BAN_DURATIONS option values — MIRRORED in velanto-backend
  // src/modules/users/ban.ts (BAN_DURATIONS). FE carries display labels too;
  // only the `value`s are the wire contract.
  it("BAN_DURATIONS values", () => {
    expect(BAN_DURATIONS.map((d) => d.value)).toEqual([
      "week",
      "month",
      "year",
      "forever",
    ]);
  });

  // NOTIFICATION_TYPES — MIRRORED in velanto-backend
  // src/modules/notifications/types/notification-type.ts.
  it("NOTIFICATION_TYPES", () => {
    expect([...NOTIFICATION_TYPES]).toEqual([
      "new_follower",
      "new_pack_from_followed",
      "new_comment",
      "pack_deleted_warning",
    ]);
  });
});

describe("locale <-> message-catalog consistency (in-repo invariant)", () => {
  // Highest-drift-risk invariant: every supported LOCALE must have a
  // messages/<locale>.json catalog and vice versa. Adding a catalog without
  // registering the locale (or registering a locale with no catalog) breaks
  // next-intl at runtime, so assert the two sets are byte-identical.
  // Vitest runs from the repo root (where vitest.config.ts lives).
  const messagesDir = path.resolve(process.cwd(), "messages");

  const catalogBasenames = readdirSync(messagesDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""))
    .sort();

  it("LOCALES has no duplicate codes", () => {
    expect(new Set(LOCALES).size).toBe(LOCALES.length);
  });

  it("DEFAULT_LOCALE is itself a member of LOCALES", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });

  it("every LOCALE has a messages/<locale>.json catalog and vice versa", () => {
    expect(catalogBasenames).toEqual([...LOCALES].sort());
  });
});
