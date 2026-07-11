"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { PasswordField } from "@/src/shared/components/form/PasswordField";
import { cn } from "@/src/shared/lib/cn";
import { sanitizeNextPath } from "@/src/shared/lib/safe-redirect";
import {
  loginSchema,
  registerSchema,
  type AuthFormValues,
} from "@/src/features/auth/auth.schema";
import { LoginFields } from "@/src/features/auth/LoginFields";
import {
  RegisterFields,
  ConfirmPasswordField,
  AcceptRulesField,
} from "@/src/features/auth/RegisterFields";
import { OtpStep } from "@/src/features/auth/OtpStep";
import {
  markCodeSent,
  getResendCooldownRemaining,
} from "@/src/features/auth/otp-cooldown";

type Mode = "login" | "register";
// Register is two steps: fill the form, then enter the emailed code.
type Step = "form" | "otp";

// Fields validated before leaving the register form for the OTP step (the
// `code` isn't entered yet, so it's excluded here).
const FORM_STEP_FIELDS = [
  "username",
  "email",
  "password",
  "confirmPassword",
  "acceptedRules",
] as const;

export function AuthForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, requestEmailCode, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("form");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [shake, setShake] = useState(false);

  const isRegister = mode === "register";

  // react-hook-form re-reads the resolver each render, so swapping schemas on a
  // mode change is enough — no need to recreate the form. `onTouched` validates
  // a field once it's been blurred and then live on every keystroke, so errors
  // surface in real time without nagging fields the user hasn't reached yet.
  const methods = useForm<AuthFormValues>({
    mode: "onTouched",
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: {
      identifier: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      code: "",
      acceptedRules: false,
    },
  });
  const {
    handleSubmit,
    reset,
    trigger,
    getValues,
    setValue,
    setError,
    formState: { isSubmitting, errors },
  } = methods;

  // An already-signed-in visitor has no business on the auth screen; send them
  // where they were headed (or home). Covers landing here directly and the case
  // where a session is restored while the form is open.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(sanitizeNextPath(searchParams.get("next")));
    }
  }, [status, router, searchParams]);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStep("form");
    setDevCode(undefined);
    // Full reset (not just clearErrors) so the new mode starts with a clean
    // slate: no carried-over values, touched, or submitted state that would
    // otherwise make the other mode's fields show errors before they're touched.
    reset();
  }

  // Send a code unless one was sent recently (cooldown persists across refresh),
  // so re-entering the form for the same email reuses the still-valid code
  // instead of tripping the backend's resend throttle.
  async function sendCode(email: string) {
    if (getResendCooldownRemaining(email) > 0) return;
    const { devCode: dev } = await requestEmailCode(email);
    markCodeSent(email);
    setDevCode(dev);
  }

  async function handleContinue() {
    const ok = await trigger(FORM_STEP_FIELDS);
    if (!ok) {
      // Continue is a submit-like action, so reveal every blocking error — even
      // on fields the user never focused (e.g. an unchecked rules box), which
      // the touched-gated display would otherwise keep hidden.
      for (const name of FORM_STEP_FIELDS) {
        setValue(name, getValues(name), { shouldTouch: true });
      }
      return;
    }
    const email = getValues("email").trim();
    setSending(true);
    try {
      await sendCode(email);
      setStep("otp");
    } catch (err) {
      setError("root", { message: messageFromError(err) });
      triggerShake();
    } finally {
      setSending(false);
    }
  }

  async function onValid(values: AuthFormValues) {
    try {
      if (isRegister) {
        await register({
          email: values.email.trim(),
          username: values.username.trim(),
          password: values.password,
          acceptedRules: true,
          code: values.code,
        });
      } else {
        await login({
          identifier: values.identifier.trim(),
          password: values.password,
        });
      }
      // Success flips auth status to "authenticated"; the effect above performs
      // the redirect (single source of truth for leaving the auth screen).
    } catch (err) {
      setError("root", {
        message: messageFromError(err, {
          statusFallbacks: { 401: t("invalidCredentials") },
        }),
      });
      triggerShake();
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div
        className="flex bg-white/[0.04] border border-border rounded-xl p-1 mb-6"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!isRegister}
          onClick={() => switchMode("login")}
          className={cn(
            "flex-1 h-[38px] rounded-[9px] text-sm font-semibold transition-colors duration-200",
            !isRegister
              ? "bg-white/[0.12] text-foreground"
              : "text-foreground-secondary",
          )}
        >
          {t("logIn")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isRegister}
          onClick={() => switchMode("register")}
          className={cn(
            "flex-1 h-[38px] rounded-[9px] text-sm font-semibold transition-colors duration-200",
            isRegister
              ? "bg-white/[0.12] text-foreground"
              : "text-foreground-secondary",
          )}
        >
          {t("tabSignup")}
        </button>
      </div>

      <Text as="h1" variant="title" className="text-2xl text-center mb-1.5">
        {isRegister ? t("headingRegister") : t("headingLogin")}
      </Text>
      <Text variant="secondary" className="text-center text-sm mb-6">
        {isRegister ? t("subtitleRegister") : t("subtitleLogin")}
      </Text>

      <FormProvider {...methods}>
        <form
          // In the register form step, submit (button or Enter) advances to the
          // OTP step rather than registering — the code isn't entered yet.
          onSubmit={
            isRegister && step === "form"
              ? (e) => {
                  e.preventDefault();
                  void handleContinue();
                }
              : handleSubmit(onValid, triggerShake)
          }
          noValidate
          className={cn(
            "flex flex-col gap-3",
            shake && "animate-[shake_0.4s_ease-in-out]",
          )}
        >
          {!isRegister && (
            <>
              <LoginFields disabled={isSubmitting} />
              <PasswordField
                name="password"
                label={t("password")}
                srOnlyLabel
                placeholder={t("password")}
                autoComplete="current-password"
                showLabel={t("showPassword")}
                hideLabel={t("hidePassword")}
                disabled={isSubmitting}
              />
            </>
          )}

          {isRegister && step === "form" && (
            <>
              <RegisterFields disabled={sending} />
              <PasswordField
                name="password"
                label={t("password")}
                srOnlyLabel
                placeholder={t("password")}
                autoComplete="new-password"
                showLabel={t("showPassword")}
                hideLabel={t("hidePassword")}
                disabled={sending}
              />
              <ConfirmPasswordField disabled={sending} />
              <AcceptRulesField disabled={sending} />
            </>
          )}

          {isRegister && step === "otp" && (
            <OtpStep
              email={getValues("email").trim()}
              onResend={() => sendCode(getValues("email").trim())}
              onChangeEmail={() => setStep("form")}
              disabled={isSubmitting}
              devCode={devCode}
            />
          )}

          {errors.root?.message && (
            <Text role="alert" className="text-sm text-[#ff6b6b]">
              {errors.root.message}
            </Text>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || sending}
            className="w-full h-[50px] mt-2"
          >
            {isSubmitting || sending
              ? t("pleaseWait")
              : !isRegister
                ? t("logIn")
                : step === "form"
                  ? t("continueStep")
                  : t("createAccount")}
          </Button>
        </form>
      </FormProvider>

      <Text
        variant="tertiary"
        className="text-center text-xs mt-5 leading-relaxed"
      >
        {t("terms")}
      </Text>
    </div>
  );
}
