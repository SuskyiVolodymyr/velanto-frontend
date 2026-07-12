import { afterEach, describe, expect, it } from "vitest";
import {
  readPackFilters,
  writePackFilters,
  type StoredPackFilters,
} from "./pack-filters-storage";

const SAMPLE: StoredPackFilters = {
  format: "save_one",
  tags: ["Movies", "Music"],
  sort: "popular",
  window: "month",
};

afterEach(() => {
  localStorage.clear();
});

describe("pack-filters-storage", () => {
  it("round-trips written filters", () => {
    writePackFilters(SAMPLE);
    expect(readPackFilters()).toEqual(SAMPLE);
  });

  it("returns null when nothing is stored", () => {
    expect(readPackFilters()).toBeNull();
  });

  it("returns null on corrupt JSON", () => {
    localStorage.setItem("velanto:pack-filters", "{not json");
    expect(readPackFilters()).toBeNull();
  });

  it("sanitizes an unknown format/sort/window back to defaults", () => {
    localStorage.setItem(
      "velanto:pack-filters",
      JSON.stringify({
        format: "bogus",
        sort: "sideways",
        window: "century",
        tags: [],
      }),
    );
    expect(readPackFilters()).toEqual({
      format: "all",
      tags: [],
      sort: "relevance",
      window: "week",
    });
  });

  it("drops tags that are not valid pack tags", () => {
    localStorage.setItem(
      "velanto:pack-filters",
      JSON.stringify({
        format: "all",
        sort: "relevance",
        window: "week",
        tags: ["Movies", "NotARealTag", 42],
      }),
    );
    expect(readPackFilters()?.tags).toEqual(["Movies"]);
  });
});
