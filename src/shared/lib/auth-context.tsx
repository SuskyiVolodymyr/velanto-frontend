"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { setAccessToken } from "@/src/shared/lib/api-client";
import { setSentryUser } from "@/src/shared/lib/sentry-reporting";
import {
  authClient,
  type LoginInput,
  type RegisterInput,
  type EmailCodeResult,
} from "@/src/shared/lib/auth-client";
import type { User } from "@/src/shared/types/user";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  requestEmailCode: (email: string) => Promise<EmailCodeResult>;
  register: (input: RegisterInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Patch the signed-in user's `avatarKey` in place (e.g. after they upload or
   * remove their own avatar) so header chrome that shows it updates live,
   * without a full session refresh.
   */
  setAvatarKey: (avatarKey: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    authClient
      .refresh()
      .then((result) => {
        if (cancelled) return;
        setAccessToken(result.accessToken);
        setUser(result.user);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setAccessToken(null);
        setUser(null);
        setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep Sentry's user context in sync with auth state so errors show which
  // account was affected (id + username only — never email; see
  // sentry-reporting.ts). Runs on login, logout, and initial refresh.
  useEffect(() => {
    setSentryUser(user);
  }, [user]);

  const requestEmailCode = useCallback(
    (email: string) => authClient.requestEmailCode(email),
    [],
  );

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authClient.register(input);
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const result = await authClient.login(input);
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout().catch(() => undefined);
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const setAvatarKey = useCallback((avatarKey: string | null) => {
    setUser((prev) => (prev ? { ...prev, avatarKey } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      requestEmailCode,
      register,
      login,
      logout,
      setAvatarKey,
    }),
    [user, status, requestEmailCode, register, login, logout, setAvatarKey],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
