import { describe, expect, it } from "vitest";
import {
  AUTH_MESSAGES,
  loginSchema,
  registerSchema,
  type AuthFormValues,
} from "./auth.schema";

/**
 * Register mode validates each field independently (per-field messages) so the
 * form can surface errors in real time as the user types. Every case fills a
 * fully-valid payload and overrides the one field under test.
 */
function values(overrides: Partial<AuthFormValues>): AuthFormValues {
  const base: AuthFormValues = {
    identifier: "alice",
    username: "alice",
    email: "a@example.com",
    password: "Password1",
    confirmPassword: "Password1",
    code: "123456",
    acceptedRules: true,
    ...overrides,
  };
  // Keep confirmPassword matching password unless a case sets it explicitly, so
  // password-rule cases exercise the composition rules, not the match rule.
  if (!("confirmPassword" in overrides)) {
    base.confirmPassword = base.password;
  }
  return base;
}

/** The message of the first issue attached to `field`, or null if none. */
function errorFor(
  schema: typeof registerSchema,
  value: AuthFormValues,
  field: keyof AuthFormValues,
): string | null {
  const r = schema.safeParse(value);
  if (r.success) return null;
  return r.error.issues.find((i) => i.path[0] === field)?.message ?? null;
}

describe("loginSchema", () => {
  it("accepts a non-empty identifier + password", () => {
    expect(
      loginSchema.safeParse(values({ identifier: "alice", password: "pw" }))
        .success,
    ).toBe(true);
  });

  it("rejects a blank identifier with the combined message", () => {
    const r = loginSchema.safeParse(
      values({ identifier: "   ", password: "pw" }),
    );
    expect(r.success ? null : r.error.issues[0].message).toBe(
      AUTH_MESSAGES.loginRequired,
    );
  });

  it("rejects an empty password with the combined message", () => {
    const r = loginSchema.safeParse(
      values({ identifier: "alice", password: "" }),
    );
    expect(r.success ? null : r.error.issues[0].message).toBe(
      AUTH_MESSAGES.loginRequired,
    );
  });
});

describe("registerSchema", () => {
  it("accepts a fully valid payload", () => {
    expect(registerSchema.safeParse(values({})).success).toBe(true);
  });

  describe("username", () => {
    it.each(["ab", "a1", "Alice", "user16charslong0"])(
      "accepts %p",
      (username) => {
        expect(registerSchema.safeParse(values({ username })).success).toBe(
          true,
        );
      },
    );

    it.each([
      ["a", "too short"],
      ["user17characterslong", "too long"],
      ["has_underscore", "underscore"],
      ["no spaces!", "space + symbol"],
      ["dash-name", "dash"],
    ])("rejects %p (%s) with the username message", (username) => {
      expect(errorFor(registerSchema, values({ username }), "username")).toBe(
        AUTH_MESSAGES.username,
      );
    });
  });

  it("rejects a malformed email with the email message", () => {
    expect(
      errorFor(registerSchema, values({ email: "not-an-email" }), "email"),
    ).toBe(AUTH_MESSAGES.email);
  });

  describe("password", () => {
    it("rejects one shorter than 8 with the length message", () => {
      expect(
        errorFor(registerSchema, values({ password: "Pass1" }), "password"),
      ).toBe(AUTH_MESSAGES.passwordLength);
    });

    it("rejects one without an uppercase letter", () => {
      expect(
        errorFor(registerSchema, values({ password: "password1" }), "password"),
      ).toBe(AUTH_MESSAGES.passwordUpper);
    });

    it("rejects one without a lowercase letter", () => {
      expect(
        errorFor(registerSchema, values({ password: "PASSWORD1" }), "password"),
      ).toBe(AUTH_MESSAGES.passwordLower);
    });

    it("rejects one without a number", () => {
      expect(
        errorFor(
          registerSchema,
          values({ password: "Passwordxx" }),
          "password",
        ),
      ).toBe(AUTH_MESSAGES.passwordDigit);
    });
  });

  describe("code", () => {
    it.each(["123456", "000000"])("accepts a 6-digit code %p", (code) => {
      expect(registerSchema.safeParse(values({ code })).success).toBe(true);
    });

    it.each(["", "12345", "1234567", "abcdef"])(
      "rejects a non-6-digit code %p with the code message",
      (code) => {
        expect(errorFor(registerSchema, values({ code }), "code")).toBe(
          AUTH_MESSAGES.code,
        );
      },
    );
  });

  it("rejects mismatched passwords on the confirmPassword field", () => {
    expect(
      errorFor(
        registerSchema,
        values({ password: "Password1", confirmPassword: "Password2" }),
        "confirmPassword",
      ),
    ).toBe(AUTH_MESSAGES.passwordsMismatch);
  });

  it("rejects a submission when the Community Rules are not accepted", () => {
    expect(
      errorFor(
        registerSchema,
        values({ acceptedRules: false }),
        "acceptedRules",
      ),
    ).toBe(AUTH_MESSAGES.acceptRules);
  });
});
