import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateMetadata } from "./page";
import { getPackServer } from "@/src/shared/lib/get-pack-server";
import type { Pack } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/get-pack-server", () => ({
  getPackServer: vi.fn(),
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
