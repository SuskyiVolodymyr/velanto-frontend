import { describe, it, expect, vi, beforeEach } from "vitest";
import messages from "@/messages/en.json";
import { OG_IMAGE_PATH } from "@/src/shared/lib/open-graph";
import { generateMetadata } from "./page";

// getTranslations needs a request context we don't have in unit tests; back it
// with the real English catalog so assertions read the shipped copy — same
// approach as app/rules/page.test.tsx.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    const value = (messages.docs as Record<string, unknown>)[key];
    return typeof value === "string" ? value : key;
  }),
}));

describe("docs generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets an absolute title, description, canonical, and OpenGraph", async () => {
    const meta = await generateMetadata();

    expect(meta.title).toEqual({ absolute: "Docs — Velanto" });
    expect(meta.description).toBe(messages.docs.metaDescription);
    expect(meta.alternates?.canonical).toMatch(/\/docs$/);
    expect(meta.openGraph?.url).toMatch(/\/docs$/);
  });

  // #235: declaring `openGraph` at all disinherits app/opengraph-image.tsx, so
  // the card has to be named here or the page previews blank everywhere OG is
  // read. Mirrors the same regression guard in app/rules/page.test.tsx.
  it("names the social card image explicitly", async () => {
    const meta = await generateMetadata();
    const images = meta.openGraph?.images as { url: string; width: number }[];

    expect(images).toHaveLength(1);
    expect(images[0].url).toBe(OG_IMAGE_PATH);
    expect(images[0].width).toBe(1200);
  });
});
