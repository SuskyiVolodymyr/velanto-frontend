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
import {
  PACK_FORMATS,
  PACK_STATUSES,
  PACK_TAGS,
  SLOT_MODES,
  GROUP_MODES,
} from "@/src/shared/types/pack";
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
import {
  PACK_LANGUAGES,
  DEFAULT_PACK_LANGUAGE,
  PACK_LANGUAGE_NAMES,
} from "@/src/shared/types/pack-language";

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

  // SLOT_MODES — MIRRORED in velanto-backend src/modules/packs/types/round.ts.
  it("SLOT_MODES", () => {
    expect([...SLOT_MODES]).toEqual(["random", "manual"]);
  });

  // GROUP_MODES — MIRRORED in velanto-backend src/modules/packs/types/round.ts.
  // How a slot gets its POOL, as opposed to SLOT_MODES' how it gets its ITEMS.
  // Absent on a slot means "fixed", which is why every stored pack survives.
  it("GROUP_MODES", () => {
    expect([...GROUP_MODES]).toEqual(["fixed", "random"]);
  });

  // PACK_STATUSES — MIRRORED in velanto-backend
  // src/modules/packs/types/moderation-status.ts (PACK_MODERATION_STATUSES).
  it("PACK_STATUSES", () => {
    expect([...PACK_STATUSES]).toEqual([
      "draft",
      "pending",
      "approved",
      "rejected",
    ]);
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

  // PACK_LANGUAGES — MIRRORED in velanto-backend
  // src/modules/packs/types/language.ts. A pack's CONTENT language, which is a
  // different concept from the interface LOCALES below — see that comment.
  it("PACK_LANGUAGES", () => {
    expect([...PACK_LANGUAGES]).toEqual([
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

  it('DEFAULT_PACK_LANGUAGE is "en" (mirrors BE DEFAULT_PACK_LANGUAGE)', () => {
    expect(DEFAULT_PACK_LANGUAGE).toBe("en");
  });

  // LOCALES — the INTERFACE languages. Related to velanto-backend's
  // PACK_LANGUAGES (src/modules/packs/types/language.ts) but no longer equal to
  // it: LOCALES must be a SUBSET of PACK_LANGUAGES, not a mirror.
  //
  // The two were identical until es/fr/pt were dropped from the interface (#226)
  // — shipping the UI in EU languages is the evidence that a Ukraine-established
  // operator targets EU data subjects (GDPR Recital 23), which triggers GDPR and
  // the DSA and their two representative requirements. A pack's *content*
  // language is user-generated metadata and carries no such signal, so
  // PACK_LANGUAGES deliberately keeps all 11: the UI is English, but a user may
  // still label their pack Spanish.
  //
  // The subset direction is what actually matters at runtime: a new pack
  // defaults to the author's interface language, so every LOCALE must be a legal
  // PACK_LANGUAGE. The reverse need not hold.
  it("LOCALES", () => {
    expect([...LOCALES]).toEqual([
      "en",
      "zh",
      "hi",
      "ar",
      "bn",
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
      REPORT_TYPES.map((type) => [
        type,
        Object.keys(REPORT_REASON_LABELS[type]),
      ]),
    );
    expect(reasonIds).toEqual({
      pack: ["inappropriate", "copyright", "spam", "other"],
      user: ["harassment", "impersonation", "spam", "other"],
      round: ["wrong_answer", "broken_media", "inappropriate", "other"],
    });
  });

  // BAN_REASONS — MIRRORED in velanto-backend src/modules/rules/types/rules.ts.
  // Absorbed from the retired rules.test.ts: uniqueness and the 'other'
  // catch-all position are asserted in the same place as the literal, so one
  // file owns everything about this list.
  it("BAN_REASONS has no duplicates and ends with the 'other' catch-all", () => {
    expect(new Set(BAN_REASONS).size).toBe(BAN_REASONS.length);
    expect(BAN_REASONS[BAN_REASONS.length - 1]).toBe("other");
  });

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
      "comment_mention",
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

  // The subset invariant, asserted from this side. LOCALES ⊆ PACK_LANGUAGES:
  // the pack-language picker defaults to the author's interface language, so an
  // interface locale the backend would reject as a pack language breaks pack
  // creation. This now reads the real PACK_LANGUAGES constant rather than an
  // inline copy of it — the constant is itself snapshotted above, so the
  // backend contract is still pinned, just in one place instead of two.
  it("every LOCALE is a legal PACK_LANGUAGE", () => {
    for (const locale of LOCALES) {
      expect([...PACK_LANGUAGES]).toContain(locale);
    }
  });

  it("every PACK_LANGUAGE has a native display name", () => {
    expect(Object.keys(PACK_LANGUAGE_NAMES).sort()).toEqual(
      [...PACK_LANGUAGES].sort(),
    );
    for (const name of Object.values(PACK_LANGUAGE_NAMES)) {
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });

  it("DEFAULT_LOCALE is itself a member of LOCALES", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });

  it("every LOCALE has a messages/<locale>.json catalog and vice versa", () => {
    expect(catalogBasenames).toEqual([...LOCALES].sort());
  });
});
