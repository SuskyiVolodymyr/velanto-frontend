import { describe, expect, it, afterEach, vi } from "vitest";
import { mediaUrl } from "./media-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("mediaUrl", () => {
  it("joins the base URL and key with a single slash", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com");
    expect(mediaUrl("media/item/abc.webp")).toBe(
      "https://cdn.example.com/media/item/abc.webp",
    );
  });

  it("does not double the slash when the base has a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com/");
    expect(mediaUrl("media/item/abc.webp")).toBe(
      "https://cdn.example.com/media/item/abc.webp",
    );
  });

  it("strips a leading slash from the key before joining", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com");
    expect(mediaUrl("/media/item/abc.webp")).toBe(
      "https://cdn.example.com/media/item/abc.webp",
    );
  });

  it("returns an empty string for an empty key", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com");
    expect(mediaUrl("")).toBe("");
  });

  // Defence in depth for velanto-backend#169. The API now refuses to store a
  // remote URL as an image item's value, but this function is the last step
  // before <img src> — so it refuses to emit one regardless of what it is
  // handed. A broken image is strictly better than silently fetching from a
  // host we do not control: that leaks every viewer's IP to a pack author's
  // chosen server, and lets approved content be swapped after moderation.
  // There is no legitimate absolute key — every image on Velanto is one we
  // issued and serve ourselves.
  it.each([
    "https://other.example.com/x.webp",
    "http://other.example.com/x.webp",
    "HTTPS://Other.Example.com/x.webp",
  ])("refuses to emit the absolute URL %s", (key) => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com");
    expect(mediaUrl(key)).toBe("");
  });

  it("falls back to a root-relative path when the base env var is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "");
    expect(mediaUrl("media/item/abc.webp")).toBe("/media/item/abc.webp");
  });
});
