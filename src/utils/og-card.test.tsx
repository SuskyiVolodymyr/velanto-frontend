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

/**
 * Collect every `style` object in the tree, then list the keys whose value is
 * `undefined`. Satori (next/og) iterates a style object's keys and calls
 * `.trim()` on each value, so a key that is PRESENT with an `undefined` value
 * (e.g. `backgroundImage: cond ? undefined : x`) throws "Cannot read properties
 * of undefined (reading 'trim')" and 500s the whole card in production — a crash
 * the structural assertions above cannot see. Omitting the key entirely is safe.
 */
function undefinedStyleKeys(node: unknown, keys: string[] = []): string[] {
  if (node == null || typeof node === "boolean") return keys;
  if (typeof node === "string" || typeof node === "number") return keys;
  if (Array.isArray(node)) {
    for (const child of node) undefinedStyleKeys(child, keys);
    return keys;
  }
  const el = node as ReactElement<{
    children?: unknown;
    style?: Record<string, unknown>;
  }>;
  if (el.props?.style) {
    for (const [key, value] of Object.entries(el.props.style)) {
      if (value === undefined) keys.push(key);
    }
  }
  undefinedStyleKeys(el.props?.children, keys);
  return keys;
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

// Regression guard for the production 500 (Sentry VELANTO-FRONTEND-B): a pack
// WITH a cover rendered `backgroundImage: undefined` on the root div, which
// Satori crashed on. No card, in any state, may leave a style key present with
// an `undefined` value.
describe("no present-but-undefined style keys (Satori .trim() crash)", () => {
  it("packOgCard with a cover leaves no undefined style values", () => {
    expect(
      undefinedStyleKeys(
        packOgCard({
          title: "Best Anime Openings",
          imageSrc: "data:image/png",
        }),
      ),
    ).toEqual([]);
  });

  it("packOgCard without a cover leaves no undefined style values", () => {
    expect(undefinedStyleKeys(packOgCard({ title: "No Cover Pack" }))).toEqual(
      [],
    );
  });

  it("profileOgCard with an avatar leaves no undefined style values", () => {
    expect(
      undefinedStyleKeys(
        profileOgCard({ username: "quizmaster", imageSrc: "data:image/png" }),
      ),
    ).toEqual([]);
  });

  it("profileOgCard without an avatar leaves no undefined style values", () => {
    expect(
      undefinedStyleKeys(profileOgCard({ username: "quizmaster" })),
    ).toEqual([]);
  });
});
