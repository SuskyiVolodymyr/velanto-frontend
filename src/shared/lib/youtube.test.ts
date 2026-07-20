import { describe, expect, it } from "vitest";
import {
  extractYouTubeId,
  extractYouTubeStart,
  youtubeThumbnailUrl,
} from "./youtube";

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

describe("extractYouTubeStart", () => {
  it("reads a bare-seconds t= on a watch link", () => {
    expect(
      extractYouTubeStart("https://www.youtube.com/watch?v=KsF_hdjWJjo&t=90"),
    ).toBe(90);
  });

  it("reads the 90s suffixed form YouTube's own share dialog emits", () => {
    expect(extractYouTubeStart("https://youtu.be/KsF_hdjWJjo?t=90s")).toBe(90);
  });

  it("reads the compound 1h2m3s form", () => {
    expect(extractYouTubeStart("https://youtu.be/KsF_hdjWJjo?t=1h2m3s")).toBe(
      3723,
    );
  });

  // Partial compounds are what people actually paste — "2m30s" off a phone.
  it("reads a compound with only some units present", () => {
    expect(extractYouTubeStart("https://youtu.be/KsF_hdjWJjo?t=2m30s")).toBe(
      150,
    );
  });

  // Embed URLs carry the timecode as `start` instead, and an author may well
  // paste one straight out of a site's share menu.
  it("reads start= on an embed link", () => {
    expect(
      extractYouTubeStart("https://www.youtube.com/embed/KsF_hdjWJjo?start=45"),
    ).toBe(45);
  });

  it("returns null when there is no timecode", () => {
    expect(
      extractYouTubeStart("https://www.youtube.com/watch?v=KsF_hdjWJjo"),
    ).toBeNull();
  });

  // A playlist `t=` sits alongside `list=`; nothing special, but it's the most
  // common way a t= arrives next to other params, so pin the ordering isn't read.
  it("reads t= regardless of where it sits among other params", () => {
    expect(
      extractYouTubeStart(
        "https://www.youtube.com/watch?v=KsF_hdjWJjo&list=PL123&t=12&index=2",
      ),
    ).toBe(12);
  });

  // Garbage must degrade to "start from the beginning", never to NaN — which
  // would reach playerVars.start and break the embed rather than the timecode.
  it("returns null for an unparseable timecode", () => {
    expect(
      extractYouTubeStart("https://youtu.be/KsF_hdjWJjo?t=abc"),
    ).toBeNull();
  });

  it("returns null for a negative or zero timecode", () => {
    expect(extractYouTubeStart("https://youtu.be/KsF_hdjWJjo?t=-5")).toBeNull();
    expect(extractYouTubeStart("https://youtu.be/KsF_hdjWJjo?t=0")).toBeNull();
  });

  it("returns null for a non-URL", () => {
    expect(extractYouTubeStart("")).toBeNull();
    expect(extractYouTubeStart("not a url at all")).toBeNull();
  });
});

describe("youtubeThumbnailUrl", () => {
  it("builds the mqdefault thumbnail URL for a video id", () => {
    expect(youtubeThumbnailUrl("KsF_hdjWJjo")).toBe(
      "https://img.youtube.com/vi/KsF_hdjWJjo/mqdefault.jpg",
    );
  });
});
