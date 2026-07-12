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

  it("sets a canonical pointing at the bare result path so all ?p= share variants consolidate", async () => {
    vi.mocked(getPackServer).mockResolvedValue(approvedPack);

    const meta = await generateMetadata(args("abc123"));

    // Bare path (no ?p=). Next resolves it against metadataBase into an
    // absolute production URL; the metadata object holds the relative form.
    expect(meta.alternates?.canonical).toBe("/packs/abc123/result");
    expect(meta.title).toBe("Best Movies — Result");
  });

  it("does not noindex a found result page — canonical alone dedupes ?p= (mixing noindex + canonical is contradictory)", async () => {
    vi.mocked(getPackServer).mockResolvedValue(approvedPack);

    const meta = await generateMetadata(args("abc123"));

    expect(meta.robots).toBeUndefined();
  });

  it("marks a missing pack noindex and sets no canonical", async () => {
    vi.mocked(getPackServer).mockResolvedValue(null);

    const meta = await generateMetadata(args("missing"));

    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toBeUndefined();
  });
});
