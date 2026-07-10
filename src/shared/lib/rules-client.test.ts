import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/src/shared/lib/api-client";
import { rulesClient } from "@/src/shared/lib/rules-client";
import type { RulesDocument } from "@/src/shared/types/rules";

vi.mock("@/src/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rulesClient", () => {
  it("getRules() fetches the rules document from /rules", async () => {
    const doc: RulesDocument = {
      version: 4,
      categories: [{ id: "spam_manipulation", title: "Spam & Manipulation", rules: [] }],
    };
    vi.mocked(apiClient.get).mockResolvedValue(doc);

    const result = await rulesClient.getRules();

    expect(apiClient.get).toHaveBeenCalledWith("/rules");
    expect(result).toEqual(doc);
  });
});
