import { describe, it, expect, vi, beforeEach } from "vitest";
import messages from "@/messages/en.json";
import { generateMetadata } from "./page";

// getTranslations needs a request context we don't have in unit tests; back it
// with the real English catalog so assertions read the shipped copy.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    // `rules` now holds a nested `content` object alongside flat string keys;
    // generateMetadata only reads string keys, so coerce non-strings to the key.
    const value = (messages.rules as Record<string, unknown>)[key];
    return typeof value === "string" ? value : key;
  }),
}));

describe("rules generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets an absolute title, description, canonical, and OpenGraph", async () => {
    const meta = await generateMetadata();

    expect(meta.title).toEqual({ absolute: "Community Rules — Velanto" });
    expect(meta.description).toBe(messages.rules.metaDescription);
    expect(meta.alternates?.canonical).toMatch(/\/rules$/);
    expect(meta.openGraph?.url).toMatch(/\/rules$/);
  });
});
