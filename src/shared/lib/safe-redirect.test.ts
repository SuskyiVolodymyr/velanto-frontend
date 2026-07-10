import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "./safe-redirect";

describe("sanitizeNextPath", () => {
  it("returns null unchanged as the fallback", () => {
    expect(sanitizeNextPath(null)).toBe("/");
  });

  it("returns a plain same-origin path unchanged", () => {
    expect(sanitizeNextPath("/create")).toBe("/create");
  });

  it("preserves query strings on the returned path", () => {
    expect(sanitizeNextPath("/packs/abc/play?round=2")).toBe(
      "/packs/abc/play?round=2",
    );
  });

  it("falls back to / for an empty string", () => {
    expect(sanitizeNextPath("")).toBe("/");
  });

  it("falls back to / for a path that doesn't start with a single slash", () => {
    expect(sanitizeNextPath("create")).toBe("/");
  });

  it("falls back to / for a protocol-relative URL (open-redirect attempt)", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/");
  });

  it("falls back to / for a backslash-prefixed value (open-redirect attempt)", () => {
    expect(sanitizeNextPath("/\\evil.com")).toBe("/");
  });

  it("falls back to / for an absolute URL to another origin", () => {
    expect(sanitizeNextPath("https://evil.com/create")).toBe("/");
  });
});
