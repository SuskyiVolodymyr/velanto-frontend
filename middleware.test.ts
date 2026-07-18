import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function reqTo(path: string, cookie?: string) {
  return new NextRequest(new URL(`http://localhost:3000${path}`), {
    headers: cookie ? { cookie } : {},
  });
}

describe("middleware — redirect signed-in visitors away from /auth", () => {
  it("lets a signed-out visitor through to /auth (no hint cookie)", () => {
    const res = middleware(reqTo("/auth"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects to home when the session hint is present", () => {
    const res = middleware(reqTo("/auth", "velanto_session=1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("honors a safe ?next= destination", () => {
    const res = middleware(reqTo("/auth?next=/settings", "velanto_session=1"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/settings");
  });

  it("never bounces back to /auth (loop guard)", () => {
    const res = middleware(reqTo("/auth?next=/auth", "velanto_session=1"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("ignores an off-site ?next= (open-redirect guard)", () => {
    const res = middleware(
      reqTo("/auth?next=https://evil.example", "velanto_session=1"),
    );
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });
});
