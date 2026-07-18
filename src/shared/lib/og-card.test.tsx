import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { packOgCard, profileOgCard } from "./og-card";

/**
 * Walk a JSX tree and collect every string child + every `img` src. The cards
 * are consumed by Satori (not the DOM), so we assert on the element tree
 * directly rather than rendering.
 */
function collect(node: unknown, text: string[], imgSrcs: string[]): void {
  if (node == null || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    text.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collect(child, text, imgSrcs);
    return;
  }
  const el = node as ReactElement<{ children?: unknown; src?: string }>;
  if (el.type === "img" && typeof el.props?.src === "string") {
    imgSrcs.push(el.props.src);
  }
  collect(el.props?.children, text, imgSrcs);
}

function inspect(node: ReactElement) {
  const text: string[] = [];
  const imgSrcs: string[] = [];
  collect(node, text, imgSrcs);
  return { text: text.join(" "), imgSrcs };
}

describe("packOgCard", () => {
  it("shows the pack title and the cover image when one is given", () => {
    const { text, imgSrcs } = inspect(
      packOgCard({ title: "Best Anime Openings", imageSrc: "data:image/x" }),
    );
    expect(text).toContain("Best Anime Openings");
    expect(text).toContain("VELANTO");
    expect(imgSrcs).toEqual(["data:image/x"]);
  });

  it("renders a text-only card (no img) when there is no cover", () => {
    const { text, imgSrcs } = inspect(packOgCard({ title: "No Cover Pack" }));
    expect(text).toContain("No Cover Pack");
    expect(imgSrcs).toEqual([]);
  });
});

describe("profileOgCard", () => {
  it("shows the username and the avatar image when one is given", () => {
    const { text, imgSrcs } = inspect(
      profileOgCard({ username: "quizmaster", imageSrc: "data:image/y" }),
    );
    expect(text).toContain("quizmaster");
    expect(text).toContain("on Velanto");
    expect(imgSrcs).toEqual(["data:image/y"]);
  });

  it("falls back to the initial (no img) when there is no avatar", () => {
    const { text, imgSrcs } = inspect(
      profileOgCard({ username: "quizmaster" }),
    );
    expect(text).toContain("quizmaster");
    // The uppercase initial stands in for the avatar.
    expect(text).toContain("Q");
    expect(imgSrcs).toEqual([]);
  });
});
