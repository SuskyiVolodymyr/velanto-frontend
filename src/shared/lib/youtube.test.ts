import { describe, expect, it } from "vitest";
import { extractYouTubeId, youtubeThumbnailUrl } from "./youtube";

describe("extractYouTubeId", () => {
  it("extracts the id from a youtu.be short link", () => {
    expect(extractYouTubeId("https://youtu.be/KsF_hdjWJjo")).toBe(
      "KsF_hdjWJjo",
    );
  });

  it("extracts the id from a watch?v= link", () => {
    expect(
      extractYouTubeId("https://www.youtube.com/watch?v=KsF_hdjWJjo"),
    ).toBe("KsF_hdjWJjo");
  });

  it("extracts the id from an /embed/ link", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/KsF_hdjWJjo")).toBe(
      "KsF_hdjWJjo",
    );
  });

  it("extracts the id from a /shorts/ link", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/KsF_hdjWJjo")).toBe(
      "KsF_hdjWJjo",
    );
  });

  it("returns null for a non-YouTube URL", () => {
    expect(extractYouTubeId("https://example.com/video")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractYouTubeId("")).toBeNull();
  });
});

describe("youtubeThumbnailUrl", () => {
  it("builds the mqdefault thumbnail URL for a video id", () => {
    expect(youtubeThumbnailUrl("KsF_hdjWJjo")).toBe(
      "https://img.youtube.com/vi/KsF_hdjWJjo/mqdefault.jpg",
    );
  });
});
