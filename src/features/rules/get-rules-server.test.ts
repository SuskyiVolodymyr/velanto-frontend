import { describe, expect, it, vi, afterEach } from "vitest";
import { getRulesServer, type RulesDocument } from "./get-rules-server";

const doc: RulesDocument = {
  version: 3,
  categories: [
    { id: "conduct", title: "Conduct", rules: [{ number: 1, text: "Be kind." }] },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getRulesServer", () => {
  it("fetches /rules with interval revalidation and returns the parsed document", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(doc), { status: 200 }));

    const result = await getRulesServer();

    expect(result).toEqual(doc);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/rules$/);
    expect(init).toMatchObject({ next: { revalidate: 3600 } });
  });

  it("throws when the backend responds non-ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));

    await expect(getRulesServer()).rejects.toThrow(/Failed to load rules: 500/);
  });
});
