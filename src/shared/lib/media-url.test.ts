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

  it("returns an already-absolute key unchanged", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com");
    expect(mediaUrl("https://other.example.com/x.webp")).toBe(
      "https://other.example.com/x.webp",
    );
  });

  it("falls back to a root-relative path when the base env var is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "");
    expect(mediaUrl("media/item/abc.webp")).toBe("/media/item/abc.webp");
  });
});
