import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "./config";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import hi from "@/messages/hi.json";
import ar from "@/messages/ar.json";
import bn from "@/messages/bn.json";
import ru from "@/messages/ru.json";
import ur from "@/messages/ur.json";
import uk from "@/messages/uk.json";

type Catalog = Record<string, unknown>;

const CATALOGS: Record<Locale, Catalog> = {
  en,
  zh,
  hi,
  ar,
  bn,
  ru,
  ur,
  uk,
};

/** Keys the source catalog may legitimately introduce that translated catalogs need not carry. */
const META_KEYS = new Set(["_note"]);

/**
 * Keys whose value is deliberately identical across every locale (notation /
 * proper nouns that are not translated), exempt from the untranslated check.
 *
 * This list shrank from 18 entries to 4 when es/fr/pt were dropped (#226): most
 * of it existed for Latin-script cognates ("Format", "Tags", "Manual",
 * "Pagination"). Every remaining non-English locale uses a non-Latin script, so
 * a string identical to English is now almost always a real bug. Keep this list
 * minimal — each entry is a hole in the check.
 */
const IDENTICAL_ALLOWED = new Set([
  // Notation — never translated.
  "formats.nxn",
  "formats.1v1",
  // Pure placeholder/punctuation, no translatable words: "{item} — {pct}%".
  "pack.topItemPct",
  // Loanword: "Email" is borrowed as-is in some locales.
  "auth.email",
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

/** Resolve a dotted `ns.key` path in the nested English catalog. Returns the
 *  value (string/object/array) or undefined if any segment is absent. Traverses
 *  the nested object rather than the flattened leaves so a `t.raw("parent")`
 *  that pulls a whole sub-tree/array still counts as present. */
function resolveKey(dotted: string): unknown {
  let node: unknown = en;
  for (const part of dotted.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (
      /\.tsx?$/.test(entry.name) &&
      !/\.(test|spec)\./.test(entry.name)
    ) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Guards against the failure that shipped twice (Fork A #287, Fork B #286): a
 * component references a catalog key that does not exist, so next-intl renders
 * the raw key path ("updates.heading", "footer.updates"). The parity checks
 * above can't catch it — a key missing from ALL locales passes parity — so this
 * checks the OTHER direction: every key a component asks for must exist.
 *
 * Deliberately conservative to avoid false positives: it only inspects files
 * that use a SINGLE translation namespace (via use/getTranslations), so each
 * `t("literal")` maps unambiguously to that namespace, and it only checks
 * string-literal keys (dynamic `t(variable)` is skipped).
 */
describe("i18n key references resolve", () => {
  const root = process.cwd();
  const files = [
    ...sourceFiles(join(root, "src")),
    ...sourceFiles(join(root, "app")),
  ];

  const missing: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const namespaces = [
      ...src.matchAll(
        /(?:use|get)Translations\(\s*["'`]([a-zA-Z0-9_.]+)["'`]\s*\)/g,
      ),
    ].map((match) => match[1]);
    const unique = [...new Set(namespaces)];
    if (unique.length !== 1) continue; // 0 = no i18n; >1 = ambiguous, skip

    const namespace = unique[0];
    for (const match of src.matchAll(
      /\bt(?:\.rich|\.raw)?\(\s*["'`]([a-zA-Z0-9_.]+)["'`]/g,
    )) {
      const dotted = `${namespace}.${match[1]}`;
      if (resolveKey(dotted) === undefined) {
        missing.push(`${dotted}  (${file.slice(root.length + 1)})`);
      }
    }
  }

  it("finds no component referencing a nonexistent catalog key", () => {
    expect([...new Set(missing)]).toEqual([]);
  });
});
