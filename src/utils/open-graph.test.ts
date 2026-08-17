import { describe, expect, it } from "vitest";
import {
  alt as cardAlt,
  contentType as cardContentType,
  size as cardSize,
} from "@/app/opengraph-image";
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

    expect(og.images).toHaveLength(1);
    expect(og.images![0].url).toBe(OG_IMAGE_PATH);
  });

  // The path is asserted against a literal, not against OG_IMAGE_PATH: every
  // other assertion here compares the helper's output to the same constant the
  // helper used to build it, so renaming the constant would keep them all green
  // while every card broke. This is the one value that must match something
  // outside this module — the route Next generates from app/opengraph-image.tsx.
  it("points at the route the file convention actually serves", () => {
    expect(OG_IMAGE_PATH).toBe("/opengraph-image");
  });

  // #235 round two: naming the image as a bare string emits ONLY og:image.
  // Next's inherited path also emits og:image:width/height/alt/type, and
  // Facebook and LinkedIn use the declared dimensions to choose large-card vs
  // thumbnail on first scrape — without them the crawler must fetch and measure
  // the image itself and often renders a small card or none, which is a slice
  // of the very bug this helper exists to fix. So the image is a full
  // descriptor, not a string.
  it("declares the card's dimensions, alt and type", () => {
    const og = buildOpenGraph({ title: "T", description: "D", url: "/x" });
    const image = og.images![0];

    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
    expect(image.type).toBe("image/png");
    expect(image.alt).toBeTruthy();
  });

  // The metadata must describe the image that is actually served. These are
  // imported from the card itself rather than duplicated, so this pins the
  // wiring: if the card is resized and the metadata isn't, it fails here.
  it("describes the card that app/opengraph-image.tsx actually renders", () => {
    const image = buildOpenGraph({ title: "T", description: "D", url: "/x" })
      .images![0];

    expect(image.width).toBe(cardSize.width);
    expect(image.height).toBe(cardSize.height);
    expect(image.alt).toBe(cardAlt);
    expect(image.type).toBe(cardContentType);
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

  // A route that co-locates its own dynamic card (pack cover+title, profile
  // avatar+name) via the `opengraph-image.tsx` file convention passes
  // deferImageToRoute. We then emit NO images, so Next merges the co-located,
  // content-hashed card instead of us naming the static site card — which would
  // override it and reintroduce the #233/#235 disinherit failure. This replaced
  // a route-handler ImageResponse (`social-card/route.tsx`) that 500'd on Vercel
  // because next/og's font/wasm weren't traced into the route-handler bundle.
  it("omits images when the route defers to a co-located opengraph-image file", () => {
    const og = buildOpenGraph({
      title: "T",
      description: "D",
      url: "/packs/p1",
      deferImageToRoute: true,
    });

    expect(og.images).toBeUndefined();
  });
});
