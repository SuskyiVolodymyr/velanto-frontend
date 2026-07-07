"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ApiError } from "@/src/shared/lib/api-client";
import { Button } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { sanitizeNextPath } from "@/src/shared/lib/safe-redirect";

type Mode = "login" | "register";

// Mirrors velanto-backend's registerSchema (src/modules/auth/dto/register.dto.ts).
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const MIN_PASSWORD_LENGTH = 8;

interface FormFields {
  identifier: string;
  username: string;
  email: string;
  password: string;
}

function validate(mode: Mode, fields: FormFields): string | null {
  if (mode === "login") {
    if (!fields.identifier.trim() || !fields.password) {
      return "Enter your email/username and password.";
    }
    return null;
  }
  if (!fields.username.trim() || !fields.email.trim() || !fields.password) {
    return "Fill in your username, email, and password.";
  }
  if (!USERNAME_PATTERN.test(fields.username.trim())) {
    return "Username must be 3-20 characters: letters, numbers, underscore only.";
  }
  if (fields.password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as { message?: string | string[] } | null;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message[0] : body.message;
    }
    if (error.status === 401) return "Invalid credentials.";
  }
  return "Something went wrong. Please try again.";
}

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [pending, setPending] = useState(false);

  const isRegister = mode === "register";

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
  }

  function triggerError(message: string) {
    setError(message);
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;

    const validationError = validate(mode, { identifier, username, email, password });
    if (validationError) {
      triggerError(validationError);
      return;
    }

    setPending(true);
    try {
      if (isRegister) {
        await register({ email: email.trim(), username: username.trim(), password });
      } else {
        await login({ identifier: identifier.trim(), password });
      }
      router.push(sanitizeNextPath(searchParams.get("next")));
    } catch (err) {
      triggerError(messageFromError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="flex bg-white/[0.04] border border-border rounded-xl p-1 mb-6" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={!isRegister}
          onClick={() => switchMode("login")}
          className={cn(
            "flex-1 h-[38px] rounded-[9px] text-sm font-semibold transition-colors duration-200",
            !isRegister ? "bg-white/[0.12] text-foreground" : "text-foreground-secondary",
          )}
        >
          Log in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isRegister}
          onClick={() => switchMode("register")}
          className={cn(
            "flex-1 h-[38px] rounded-[9px] text-sm font-semibold transition-colors duration-200",
            isRegister ? "bg-white/[0.12] text-foreground" : "text-foreground-secondary",
          )}
        >
          Sign up
        </button>
      </div>

      <Text as="h1" variant="title" className="text-2xl text-center mb-1.5">
        {isRegister ? "Join Velanto" : "Log in to Velanto"}
      </Text>
      <Text variant="secondary" className="text-center text-sm mb-6">
        {isRegister
          ? "Create packs and play, save your results."
          : "Sign in to build and play packs."}
      </Text>

      <form
        onSubmit={handleSubmit}
        noValidate
        className={cn("flex flex-col gap-3", shake && "animate-[shake_0.4s_ease-in-out]")}
      >
        {isRegister && (
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            aria-label="Username"
            autoComplete="username"
            disabled={pending}
          />
        )}
        {isRegister ? (
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            aria-label="Email"
            autoComplete="email"
            disabled={pending}
          />
        ) : (
          <Input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email or username"
            aria-label="Email or username"
            autoComplete="username"
            disabled={pending}
          />
        )}
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          aria-label="Password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          disabled={pending}
        />

        {error && <Text className="text-sm text-[#ff6b6b]">{error}</Text>}

        <Button type="submit" disabled={pending} className="w-full h-[50px] mt-2">
          {pending ? "Please wait…" : isRegister ? "Create account" : "Log in"}
        </Button>
      </form>

      <Text variant="tertiary" className="text-center text-xs mt-5 leading-relaxed">
        By continuing you agree to Velanto&apos;s Terms and Privacy Policy.
      </Text>
    </div>
  );
}
