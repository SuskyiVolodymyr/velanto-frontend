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
};
