import { describe, expect, it } from "vitest";
import { buildOpenGraph, OG_IMAGE_PATH } from "./open-graph";

describe("buildOpenGraph", () => {
  // The bug this helper exists to prevent (#235): declaring an `openGraph`
  // object in generateMetadata() stops Next inheriting app/opengraph-image.tsx,
  // so any route that declares one MUST name the image explicitly. Four routes
  // declared it; two forgot, and previewed blank on every OG consumer.
  it("always includes the site card image", () => {
    const og = buildOpenGraph({
      title: "T",
      description: "D",
      url: "https://playvelanto.com/rules",
    });

    expect(og.images).toEqual([OG_IMAGE_PATH]);
  });

  it("passes through title, description and url", () => {
    const og = buildOpenGraph({
      title: "Community Rules — Velanto",
      description: "The rules",
      url: "https://playvelanto.com/rules",
    });

    expect(og.title).toBe("Community Rules — Velanto");
    expect(og.description).toBe("The rules");
    expect(og.url).toBe("https://playvelanto.com/rules");
  });

  it("defaults to the website type", () => {
    const og = buildOpenGraph({ title: "T", description: "D", url: "/x" });

    expect(og.type).toBe("website");
  });

  // Profiles declare type: "profile" so the card renders as a person rather
  // than a page on consumers that distinguish them.
  it("accepts an explicit type", () => {
    const og = buildOpenGraph({
      title: "T",
      description: "D",
      url: "/x",
      type: "profile",
    });

    expect(og.type).toBe("profile");
  });
});
