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
  /** 6-digit code from POST /auth/email-verification/request (verify-before-create). */
  code: string;
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
