"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { TextField } from "@/src/shared/components/form/TextField";
import { cn } from "@/src/shared/lib/cn";
import { sanitizeNextPath } from "@/src/shared/lib/safe-redirect";
import { loginSchema, registerSchema, type AuthFormValues } from "@/src/features/auth/auth.schema";

type Mode = "login" | "register";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [shake, setShake] = useState(false);

  const isRegister = mode === "register";

  // react-hook-form re-reads the resolver each render, so swapping schemas on a
  // mode change is enough — no need to recreate the form.
  const methods = useForm<AuthFormValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: { identifier: "", username: "", email: "", password: "" },
  });
  const {
    handleSubmit,
    clearErrors,
    setError,
    formState: { isSubmitting, errors },
  } = methods;

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  function switchMode(next: Mode) {
    setMode(next);
    clearErrors();
  }

  async function onValid(values: AuthFormValues) {
    try {
      if (isRegister) {
        await register({
          email: values.email.trim(),
          username: values.username.trim(),
          password: values.password,
        });
      } else {
        await login({ identifier: values.identifier.trim(), password: values.password });
      }
      router.push(sanitizeNextPath(searchParams.get("next")));
    } catch (err) {
      setError("root", {
        message: messageFromError(err, { statusFallbacks: { 401: "Invalid credentials." } }),
      });
      triggerShake();
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

      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(onValid, triggerShake)}
          noValidate
          className={cn("flex flex-col gap-3", shake && "animate-[shake_0.4s_ease-in-out]")}
        >
          {isRegister && (
            <TextField
              name="username"
              label="Username"
              srOnlyLabel
              placeholder="Username"
              autoComplete="username"
              disabled={isSubmitting}
            />
          )}
          {isRegister ? (
            <TextField
              name="email"
              label="Email"
              srOnlyLabel
              type="email"
              placeholder="Email"
              autoComplete="email"
              disabled={isSubmitting}
            />
          ) : (
            <TextField
              name="identifier"
              label="Email or username"
              srOnlyLabel
              placeholder="Email or username"
              autoComplete="username"
              disabled={isSubmitting}
            />
          )}
          <TextField
            name="password"
            label="Password"
            srOnlyLabel
            type="password"
            placeholder="Password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            disabled={isSubmitting}
          />

          {errors.root?.message && (
            <Text role="alert" className="text-sm text-[#ff6b6b]">
              {errors.root.message}
            </Text>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full h-[50px] mt-2">
            {isSubmitting ? "Please wait…" : isRegister ? "Create account" : "Log in"}
          </Button>
        </form>
      </FormProvider>

      <Text variant="tertiary" className="text-center text-xs mt-5 leading-relaxed">
        By continuing you agree to Velanto&apos;s Terms and Privacy Policy.
      </Text>
    </div>
  );
}
