import { apiClient } from "@/src/shared/lib/api-client";
import type { User } from "@/src/shared/types/user";

export interface AuthResult {
  accessToken: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  /** Backend requires an explicit acceptance of the Community Rules. */
  acceptedRules: true;
  /**
   * 6-digit code from POST /auth/email-verification/request. Optional because the
   * verify-before-create challenge is env-gated on the backend
   * (EMAIL_VERIFICATION_ENABLED) and off by default — omitted for one-step
   * register, present only when GET /auth/providers reports it's required.
   */
  code?: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface EmailCodeResult {
  sent: boolean;
  /** Present only in non-production so dev/manual testing can read the code. */
  devCode?: string;
}

export interface ResetPasswordInput {
  email: string;
  /** 6-digit code from POST /auth/password-reset/request. */
  code: string;
  newPassword: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** Auth-screen config the backend reports (GET /auth/providers). */
export interface OAuthProviders {
  google: boolean;
  discord: boolean;
  /**
   * Whether register requires the two-step email-ownership code. Off by default
   * (see the backend's EMAIL_VERIFICATION_ENABLED) — when false/absent the form
   * registers in one step. Optional so an older backend that omits it reads as
   * off rather than failing the type.
   */
  emailVerification?: boolean;
}

export const authClient = {
  /** Sends a verification code to `email` for the register flow. */
  requestEmailCode: (email: string) =>
    apiClient.post<EmailCodeResult>("/auth/email-verification/request", {
      email,
    }),
  register: (input: RegisterInput) =>
    apiClient.post<AuthResult>("/auth/register", input),
  login: (input: LoginInput) =>
    apiClient.post<AuthResult>("/auth/login", input),
  refresh: () => apiClient.post<AuthResult>("/auth/refresh"),
  logout: () => apiClient.post<{ success: true }>("/auth/logout"),
  /** Forgot-password: request a reset code. Always reports `sent` (the backend
   * won't say whether the email is registered); `devCode` only in non-prod. */
  requestPasswordReset: (email: string) =>
    apiClient.post<EmailCodeResult>("/auth/password-reset/request", { email }),
  /** Forgot-password: prove the code and set a new password. */
  resetPassword: (input: ResetPasswordInput) =>
    apiClient.post<{ reset: true }>("/auth/password-reset/confirm", input),
  /** Change password while signed in (requires the current password). */
  changePassword: (input: ChangePasswordInput) =>
    apiClient.patch<{ changed: true }>("/auth/password", input),
  /** Set a first password on an OAuth-only account (no current password). */
  setPassword: (newPassword: string) =>
    apiClient.post<{ set: true }>("/auth/set-password", { newPassword }),
  /** Attach a verified email to an account that has none (code proves ownership). */
  addEmail: (email: string, code: string) =>
    apiClient.post<{ email: string }>("/auth/email", { email, code }),
  /** Which OAuth providers are enabled — the auth screen only shows working buttons. */
  oauthProviders: () => apiClient.get<OAuthProviders>("/auth/providers"),
  /**
   * Start connecting `provider` to the signed-in account: drops the server's
   * one-shot link cookie. The caller then top-level-navigates to
   * `${API_BASE}/auth/${provider}` so that cookie rides the OAuth round-trip
   * and the provider is linked (not logged in as a new account).
   */
  startOAuthLink: (provider: "google" | "discord") =>
    apiClient.post<{ started: true }>("/auth/oauth-link/start", { provider }),
  /**
   * Soft-delete (deactivate) the signed-in account. Requires the current
   * password; starts the 30-day grace period and revokes every session. Logging
   * back in within the window reactivates the account.
   */
  deleteAccount: (currentPassword: string) =>
    apiClient.delete<{ deactivated: true }>("/auth/account", {
      body: { currentPassword },
    }),
  /** GDPR data export: the caller's full data ("download my data"). */
  exportMyData: () =>
    apiClient.get<Record<string, unknown>>("/users/me/export"),
};
