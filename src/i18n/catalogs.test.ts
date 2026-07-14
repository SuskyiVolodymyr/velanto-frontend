import { describe, expect, it } from "vitest";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "./config";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import hi from "@/messages/hi.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import ar from "@/messages/ar.json";
import bn from "@/messages/bn.json";
import pt from "@/messages/pt.json";
import ru from "@/messages/ru.json";
import ur from "@/messages/ur.json";
import uk from "@/messages/uk.json";

type Catalog = Record<string, unknown>;

const CATALOGS: Record<Locale, Catalog> = {
  en,
  zh,
  hi,
  es,
  fr,
  ar,
  bn,
  pt,
  ru,
  ur,
  uk,
};

/** Keys the source catalog may legitimately introduce that translated catalogs need not carry. */
const META_KEYS = new Set(["_note"]);

/**
 * Keys whose value is deliberately identical across every locale (notation /
 * proper nouns that are not translated), exempt from the untranslated check.
 */
const IDENTICAL_ALLOWED = new Set([
  // Notation — never translated.
  "formats.nxn",
  "formats.1v1",
  // Pure placeholder/punctuation, no translatable words: "{item} — {pct}%".
  "pack.topItemPct",
  // Cognates / loanwords that are genuinely the same word in some locales.
  "home.sortPopular",
  "home.groupFormat",
  "home.groupTags",
  "home.tagCount",
  // "Pagination" is the identical word in French.
  "home.pagination",
  // "Date" is the identical word in French.
  "home.sortDate",
  // create-form loanwords: "Format" (fr), "Tags" (fr/pt), "Manual" (es/pt),
  // "Link" (pt) are the same word in those locales.
  "create.formatHeading",
  "create.tags",
  "create.manual",
  "create.link",
  // "Image" is the same word in fr.
  "create.image",
  // profile loanwords: "Bio" is the same word in most Latin-script locales, and
  // "Packs" stays untranslated where the catalog keeps the borrowed "pack".
  "profile.bio",
  "profile.packs",
  // auth loanword: "Email" is the same word (borrowed) in several locales.
  "auth.email",
  // settings loanword: "Notifications" is identical in fr (and other locales).
  "settings.notificationsHeading",
  // feedback loanwords: "score", "Status", "Bug" are borrowed as-is in some
  // Latin-script locales.
  "feedback.scoreLabel",
  "feedback.statusSelectLabel",
  "feedback.topicBug",
]);

/**
 * Flatten a nested message catalog into `a.b.c` → string leaves. Recurses into
 * both objects and arrays (arrays index by position, e.g. structured lists such
 * as `pack.howItPlays.save_one.0.title`).
 */
function flatten(obj: Catalog, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (META_KEYS.has(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      Object.assign(out, flatten(value as Catalog, path));
    } else if (typeof value === "string") {
      out[path] = value;
    } else {
      throw new Error(`Unexpected non-string leaf at ${path}`);
    }
  }
  return out;
}

/** ICU-style interpolation placeholders, e.g. `{date}`, `{count}`. */
function placeholders(value: string): string[] {
  return (value.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
}

/** Rich-text markup tags used by next-intl's `t.rich`, e.g. `<link>…</link>`. */
function tags(value: string): string[] {
  return (value.match(/<\/?[a-zA-Z][a-zA-Z0-9]*>/g) ?? []).sort();
}

const EN = flatten(en);
const EN_KEYS = Object.keys(EN).sort();
const NON_EN = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

describe("message catalogs", () => {
  it("declares a catalog file for every supported locale", () => {
    for (const locale of LOCALES) {
      expect(CATALOGS[locale], `missing catalog for ${locale}`).toBeDefined();
    }
  });

  describe.each(NON_EN)("%s", (locale) => {
    const flat = flatten(CATALOGS[locale]);

    it("has exactly the same key set as en.json", () => {
      expect(Object.keys(flat).sort()).toEqual(EN_KEYS);
    });

    it("preserves ICU placeholders and rich-text tags for every key", () => {
      for (const key of EN_KEYS) {
        expect(
          placeholders(flat[key]),
          `placeholders differ for ${key}`,
        ).toEqual(placeholders(EN[key]));
        expect(tags(flat[key]), `tags differ for ${key}`).toEqual(
          tags(EN[key]),
        );
      }
    });

    it("leaves no string identical to the English source (untranslated placeholder)", () => {
      const untranslated = EN_KEYS.filter(
        (key) => flat[key] === EN[key] && !IDENTICAL_ALLOWED.has(key),
      );
      expect(untranslated, `untranslated keys in ${locale}`).toEqual([]);
    });
  });
});
