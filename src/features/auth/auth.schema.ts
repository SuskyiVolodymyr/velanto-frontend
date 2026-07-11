import { z } from "zod";

// Mirrors velanto-backend's register.dto.ts (usernameSchema / passwordSchema).
export const USERNAME_PATTERN = /^[a-zA-Z0-9]{2,16}$/;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

// Validation copy is hardcoded English (matches the existing auth-schema
// convention; the rest of the app's user-facing text is next-intl). Exported so
// the form and tests reference one source of truth instead of duplicating
// strings.
export const AUTH_MESSAGES = {
  loginRequired: "Enter your email/username and password.",
  username: "Username must be 2-16 characters: letters and numbers only.",
  email: "Enter a valid email address.",
  passwordLength: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  passwordMax: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
  passwordLower: "Password must include a lowercase letter.",
  passwordUpper: "Password must include an uppercase letter.",
  passwordDigit: "Password must include a number.",
  passwordsMismatch: "Passwords do not match.",
  acceptRules: "You must accept the Community Rules to register.",
  code: "Enter the 6-digit code sent to your email.",
} as const;

// Both modes share one object shape (all fields always registered on the form)
// so the react-hook-form values type stays stable across the login/register
// toggle. Each schema only refines the fields its mode uses.
const authFields = z.object({
  identifier: z.string(),
  username: z.string(),
  email: z.string(),
  password: z.string(),
  confirmPassword: z.string(),
  // Entered on the OTP step; only register mode validates it (6 digits).
  code: z.string(),
  acceptedRules: z.boolean(),
});

export type AuthFormValues = z.infer<typeof authFields>;

// Login: both fields required, one combined message on the identifier field.
export const loginSchema = authFields.superRefine((data, ctx) => {
  if (!data.identifier.trim() || !data.password) {
    ctx.addIssue({
      code: "custom",
      message: AUTH_MESSAGES.loginRequired,
      path: ["identifier"],
    });
  }
});

// Register: per-field validation (each field carries its own message) so the
// form can show errors in real time as the user types. The password-composition
// checks run in order; zod surfaces the first unmet rule for that field.
export const registerSchema = authFields
  .extend({
    // Trim first so accidental leading/trailing whitespace is tolerated; the
    // regex still forbids spaces *within* the username ("no spaces allowed").
    username: z.string().trim().regex(USERNAME_PATTERN, AUTH_MESSAGES.username),
    email: z.string().trim().email(AUTH_MESSAGES.email),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, AUTH_MESSAGES.passwordLength)
      .max(MAX_PASSWORD_LENGTH, AUTH_MESSAGES.passwordMax)
      .regex(/[a-z]/, AUTH_MESSAGES.passwordLower)
      .regex(/[A-Z]/, AUTH_MESSAGES.passwordUpper)
      .regex(/[0-9]/, AUTH_MESSAGES.passwordDigit),
    code: z.string().regex(/^\d{6}$/, AUTH_MESSAGES.code),
    acceptedRules: z.literal(true, { message: AUTH_MESSAGES.acceptRules }),
  })
  .superRefine((data, ctx) => {
    // Reported on confirmPassword so the error sits under that field. No length
    // guard — an empty confirm still fails at submit; real-time display is gated
    // per-field by touched state in the form, so it won't nag before you type.
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: AUTH_MESSAGES.passwordsMismatch,
        path: ["confirmPassword"],
      });
    }
  });
