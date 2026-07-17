import { describe, it, expect, vi, beforeEach } from "vitest";
import messages from "@/messages/en.json";
import { generateMetadata } from "./page";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/get-pack-server", () => ({
  getPackServer: vi.fn(),
}));

// getTranslations needs a request context we don't have in unit tests; back it
// with the real English catalog (interpolating {args}) so titles read the
// shipped copy.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(
    async () => (key: string, vals?: Record<string, unknown>) => {
      let out = (messages.pages as Record<string, string>)[key] ?? key;
      for (const [k, v] of Object.entries(vals ?? {}))
        out = out.replaceAll(`{${k}}`, String(v));
      return out;
    },
  ),
}));

const approvedPack = { id: "abc123", title: "Best Movies" } as unknown as Pack;

function args(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("result page generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // #243 reverses #67/#73 here. The canonical existed to consolidate the
  // per-viewer ?p= share variants onto "one indexable URL" — but #222 gated
  // this page on having played, so that URL now renders "Finish the pack to
  // see the results" to every crawler, permanently. Pointing an index entry at
  // a page that can never serve a search visitor is worse than having none.
  it("noindexes the result page — it shows nothing to anyone who has not played", async () => {
    vi.mocked(getPackServer).mockResolvedValue(approvedPack);

    const meta = await generateMetadata(args("abc123"));

    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.title).toBe("Best Movies — Result");
  });

  // follow: true is not incidental. The page links to the pack and its author,
  // and those are worth crawling — it is this URL that should not be a search
  // result, not the things it points at.
  it("still lets crawlers follow the links out", async () => {
    vi.mocked(getPackServer).mockResolvedValue(approvedPack);

    const meta = await generateMetadata(args("abc123"));

    expect(meta.robots).toMatchObject({ follow: true });
  });

  // noindex does the ?p= de-duplication the canonical was there for, and does
  // it without the contradiction #73 was avoiding: Google treats noindex +
  // canonical on one URL as conflicting signals, so the canonical is dropped
  // rather than paired with it.
  it("sets no canonical, so noindex is not paired with a conflicting signal", async () => {
    vi.mocked(getPackServer).mockResolvedValue(approvedPack);

    const meta = await generateMetadata(args("abc123"));

    expect(meta.alternates?.canonical).toBeUndefined();
  });

  it("marks a missing pack noindex and sets no canonical", async () => {
    vi.mocked(getPackServer).mockResolvedValue(null);

    const meta = await generateMetadata(args("missing"));

    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toBeUndefined();
  });
});
