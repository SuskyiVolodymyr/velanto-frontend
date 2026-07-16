import { afterEach, describe, expect, it } from "vitest";
import {
  readPackFilters,
  writePackFilters,
  type StoredPackFilters,
} from "./pack-filters-storage";

const SAMPLE: StoredPackFilters = {
  format: "save_one",
  tags: ["Movies", "Music"],
  languages: ["uk", "es"],
  sort: "popular",
  window: "month",
  dateOrder: "newest",
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

  it("sanitizes an unknown format/sort/window/dateOrder back to defaults", () => {
    localStorage.setItem(
      "velanto:pack-filters",
      JSON.stringify({
        format: "bogus",
        sort: "sideways",
        window: "century",
        dateOrder: "sideways",
        tags: [],
      }),
    );
    expect(readPackFilters()).toEqual({
      format: "all",
      tags: [],
      languages: [],
      sort: "popular",
      window: "month",
      dateOrder: "newest",
    });
  });

  // A blob written before the date sort shipped has no `dateOrder` key at all.
  it("reads a legacy blob with no dateOrder back as the default", () => {
    localStorage.setItem(
      "velanto:pack-filters",
      JSON.stringify({
        format: "all",
        sort: "popular",
        window: "week",
        tags: [],
      }),
    );

    expect(readPackFilters()?.dateOrder).toBe("newest");
  });

  // The Relevance sort was removed; a blob that still has it selected must
  // sanitize to the current default rather than feed an unknown sort to the feed.
  it("migrates a stored 'relevance' sort to the default (popular)", () => {
    localStorage.setItem(
      "velanto:pack-filters",
      JSON.stringify({
        format: "all",
        sort: "relevance",
        window: "week",
        tags: [],
      }),
    );

    expect(readPackFilters()?.sort).toBe("popular");
  });

  // The API 400s on an unknown language code, so a stale or hand-edited blob
  // must never reach the wire — otherwise a taxonomy change would break the
  // feed for anyone whose stored filters predate it, with no way to recover
  // but clearing localStorage.
  it("drops unknown language codes from a stored blob", () => {
    localStorage.setItem(
      "velanto:pack-filters",
      JSON.stringify({
        format: "all",
        tags: [],
        languages: ["uk", "klingon", "es"],
        sort: "popular",
        window: "month",
        dateOrder: "newest",
      }),
    );

    expect(readPackFilters()?.languages).toEqual(["uk", "es"]);
  });

  it("defaults languages to empty when the key is absent or not an array", () => {
    localStorage.setItem(
      "velanto:pack-filters",
      JSON.stringify({ format: "all", tags: [], languages: "uk" }),
    );
    expect(readPackFilters()?.languages).toEqual([]);
  });

  it("round-trips the date sort with an oldest-first order", () => {
    const filters: StoredPackFilters = {
      format: "all",
      tags: [],
      languages: [],
      sort: "date",
      window: "month",
      dateOrder: "oldest",
    };
    writePackFilters(filters);
    expect(readPackFilters()).toEqual(filters);
  });

  it("drops tags that are not valid pack tags", () => {
    localStorage.setItem(
      "velanto:pack-filters",
      JSON.stringify({
        format: "all",
        sort: "popular",
        window: "week",
        tags: ["Movies", "NotARealTag", 42],
      }),
    );
    expect(readPackFilters()?.tags).toEqual(["Movies"]);
  });
});
