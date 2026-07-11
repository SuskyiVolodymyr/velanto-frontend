import { z } from "zod";

// Mirrors velanto-backend's registerSchema (src/modules/auth/dto/register.dto.ts).
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
export const MIN_PASSWORD_LENGTH = 8;

// Both modes share one object shape (all four fields always registered on the
// form); each schema only refines the fields its mode uses. This keeps the
// react-hook-form values type stable across the login/register toggle.
const authFields = z.object({
  identifier: z.string(),
  username: z.string(),
  email: z.string(),
  password: z.string(),
  // Only meaningful in register mode; login ignores these. Kept on the shared
  // shape so the react-hook-form values type stays stable across the toggle.
  confirmPassword: z.string(),
  acceptedRules: z.boolean(),
});

export type AuthFormValues = z.infer<typeof authFields>;

// Login: both fields required. Single combined message (attached to the
// identifier field) — same copy the old `validate()` returned.
export const loginSchema = authFields.superRefine((data, ctx) => {
  if (!data.identifier.trim() || !data.password) {
    ctx.addIssue({
      code: "custom",
      message: "Enter your email/username and password.",
      path: ["identifier"],
    });
  }
});

// Register: same sequential rules + copy as the old `validate()`. At most one
// issue is added, preserving the original first-failure precedence.
export const registerSchema = authFields
  .extend({
    acceptedRules: z.literal(true, {
      message: "You must accept the Community Rules to register.",
    }),
  })
  .superRefine((data, ctx) => {
    if (!data.username.trim() || !data.email.trim() || !data.password) {
      ctx.addIssue({
        code: "custom",
        message: "Fill in your username, email, and password.",
        path: ["username"],
      });
      return;
    }
    if (!USERNAME_PATTERN.test(data.username.trim())) {
      ctx.addIssue({
        code: "custom",
        message:
          "Username must be 3-20 characters: letters, numbers, underscore only.",
        path: ["username"],
      });
      return;
    }
    if (data.password.length < MIN_PASSWORD_LENGTH) {
      ctx.addIssue({
        code: "custom",
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        path: ["password"],
      });
      return;
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });
