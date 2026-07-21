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
import { setSessionHint } from "@/src/shared/lib/session-hint";
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
  /**
   * Re-establish auth state from the refresh cookie — used after an OAuth popup
   * completes (the popup set the cookie; this turns it into a live session for
   * login, or picks up the freshly linked provider for connect).
   */
  /**
   * Re-ask the server who we are, and RETURN the answer.
   *
   * Returns the user on success and null when there is no live session. The
   * return value matters because React state updates are not visible to the
   * caller synchronously, so a caller that needs to branch on the outcome — the
   * OAuth popup deciding whether a closed window was a cancellation or a
   * completed sign-in whose message got lost — cannot read it off `user`.
   */
  revalidate: () => Promise<User | null>;
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

  // Mirror a lightweight "signed in" hint onto a frontend-origin cookie so
  // middleware can redirect signed-in visitors away from /auth without a client
  // flash. Only flip on a settled status — during "loading" a returning user's
  // hint must persist so the server redirect fires on the very first paint.
  useEffect(() => {
    if (status === "authenticated") setSessionHint(true);
    else if (status === "unauthenticated") setSessionHint(false);
  }, [status]);

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

  const revalidate = useCallback(async (): Promise<User | null> => {
    try {
      const result = await authClient.refresh();
      setAccessToken(result.accessToken);
      setUser(result.user);
      setStatus("authenticated");
      return result.user;
    } catch {
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
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
      revalidate,
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
      revalidate,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
