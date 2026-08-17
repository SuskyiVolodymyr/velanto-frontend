import { describe, it, expect } from "vitest";
import { securityHeaders } from "./security-headers";

describe("securityHeaders", () => {
  const byKey = Object.fromEntries(
    securityHeaders.map((h) => [h.key, h.value]),
  );

  it("includes the core hardening headers", () => {
    expect(byKey["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
    expect(byKey["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Permissions-Policy"]).toBeDefined();
  });

  it("enforces HTTPS across subdomains for a long window", () => {
    const hsts = byKey["Strict-Transport-Security"];
    expect(hsts).toContain("includeSubDomains");
    const maxAge = Number(hsts.match(/max-age=(\d+)/)?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31536000); // >= 1 year
  });
});
