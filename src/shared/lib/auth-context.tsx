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
import {
  setAccessToken,
  setSessionCallbacks,
} from "@/src/shared/lib/api-client";
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
  /**
   * Patch arbitrary fields of the signed-in user in place — e.g. after setting a
   * first password (`hasPassword`) or adding an email (`email`) from Settings, so
   * the UI reflects it without a full refresh.
   */
  patchUser: (partial: Partial<User>) => void;
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

  // Let the api-client keep React auth state in sync when it silently renews an
  // expired access token on a 401 (see api-client's sendWithRefresh). Without
  // this, a background token renewal would refresh the token but leave the
  // cached user stale, and a dead session (refresh cookie gone) would keep the
  // UI showing "signed in" while every request 401s.
  useEffect(() => {
    setSessionCallbacks({
      onRefreshed: (refreshedUser) => {
        setUser(refreshedUser);
        setStatus("authenticated");
      },
      onLost: () => {
        setUser(null);
        setStatus("unauthenticated");
      },
    });
    return () => setSessionCallbacks(null);
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

  const patchUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
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
      patchUser,
    }),
    [
      user,
      status,
      requestEmailCode,
      register,
      login,
      logout,
      setAvatarKey,
      patchUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
