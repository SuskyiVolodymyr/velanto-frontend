import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, type AuthFormValues } from "./auth.schema";

/**
 * These encode the EXACT rules + copy the old module-level `validate()` used,
 * so behavior is preserved 1:1 through the react-hook-form migration.
 *
 * Both schemas share one object shape (all four fields always registered on the
 * form), so every case fills the whole shape — mirroring how the form submits.
 */
function values(overrides: Partial<AuthFormValues>): AuthFormValues {
  return { identifier: "", username: "", email: "", password: "", ...overrides };
}

function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : result.error!.issues[0].message;
}

describe("loginSchema", () => {
  it("accepts a non-empty identifier + password", () => {
    expect(loginSchema.safeParse(values({ identifier: "alice", password: "pw" })).success).toBe(
      true,
    );
  });

  it("rejects a blank identifier with the combined message", () => {
    const r = loginSchema.safeParse(values({ identifier: "   ", password: "pw" }));
    expect(firstError(r)).toBe("Enter your email/username and password.");
  });

  it("rejects an empty password with the combined message", () => {
    const r = loginSchema.safeParse(values({ identifier: "alice", password: "" }));
    expect(firstError(r)).toBe("Enter your email/username and password.");
  });
});

describe("registerSchema", () => {
  it("accepts a valid username + email + password", () => {
    expect(
      registerSchema.safeParse(
        values({ username: "alice", email: "a@example.com", password: "password123" }),
      ).success,
    ).toBe(true);
  });

  it("rejects any empty required field with the combined message", () => {
    const r = registerSchema.safeParse(
      values({ username: "", email: "a@example.com", password: "password123" }),
    );
    expect(firstError(r)).toBe("Fill in your username, email, and password.");
  });

  it("rejects a username with invalid characters", () => {
    const r = registerSchema.safeParse(
      values({ username: "no spaces!", email: "a@example.com", password: "password123" }),
    );
    expect(firstError(r)).toBe(
      "Username must be 3-20 characters: letters, numbers, underscore only.",
    );
  });

  it("rejects a username that is too short", () => {
    const r = registerSchema.safeParse(
      values({ username: "ab", email: "a@example.com", password: "password123" }),
    );
    expect(firstError(r)).toBe(
      "Username must be 3-20 characters: letters, numbers, underscore only.",
    );
  });

  it("rejects a password shorter than 8 characters", () => {
    const r = registerSchema.safeParse(
      values({ username: "alice", email: "a@example.com", password: "short" }),
    );
    expect(firstError(r)).toBe("Password must be at least 8 characters.");
  });

  it("reports the empty-field message before the username-pattern message (matches old precedence)", () => {
    const r = registerSchema.safeParse(values({ username: "", email: "", password: "" }));
    expect(firstError(r)).toBe("Fill in your username, email, and password.");
  });
});
