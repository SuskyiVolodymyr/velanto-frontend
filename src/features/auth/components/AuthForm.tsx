"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { messageFromError } from "@/utils/messageFromError";
import { Lock } from "lucide-react";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { PasswordField } from "@/ui/form/PasswordField";
import { FormBanner } from "@/ui/form/FormBanner";
import { cn } from "@/utils/cn";
import { sanitizeNextPath } from "@/utils/safe-redirect";
import {
  loginSchema,
  registerSchema,
  registerSchemaNoCode,
  type AuthFormValues,
} from "@/features/auth/auth.schema";
import { LoginFields } from "@/features/auth/components/LoginFields";
import {
  RegisterFields,
  ConfirmPasswordField,
  AcceptRulesField,
} from "@/features/auth/components/RegisterFields";
import { OtpStep } from "@/features/auth/components/OtpStep";
import { OAuthButtons } from "@/features/auth/components/OAuthButtons";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import {
  AuthModeTabs,
  type AuthMode,
} from "@/features/auth/components/AuthModeTabs";
import { AuthTermsNote } from "@/features/auth/components/AuthTermsNote";
import { useEmailVerification } from "@/features/auth/hooks/use-email-verification";
import { useRegisterOtp } from "@/features/auth/hooks/use-register-otp";

export function AuthForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, requestEmailCode, login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [shake, setShake] = useState(false);
  // The forgot-password flow replaces the login/register card when active.
  const [forgot, setForgot] = useState(false);
  const emailVerification = useEmailVerification();

  const isRegister = mode === "register";
  // Register is two-step (fill form → emailed code) only when the backend
  // requires it; otherwise a single submit creates the account.
  const twoStep = isRegister && emailVerification;

  // react-hook-form re-reads the resolver each render, so swapping schemas on a
  // mode change is enough — no need to recreate the form. `onTouched` validates
  // a field once it's been blurred and then live on every keystroke, so errors
  // surface in real time without nagging fields the user hasn't reached yet.
  const methods = useForm<AuthFormValues>({
    mode: "onTouched",
    resolver: zodResolver(
      isRegister
        ? emailVerification
          ? registerSchema
          : registerSchemaNoCode
        : loginSchema,
    ),
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
    getValues,
    setError,
    formState: { isSubmitting, errors },
  } = methods;

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  const otp = useRegisterOtp({
    methods,
    requestEmailCode,
    onFailure: triggerShake,
  });

  // An already-signed-in visitor has no business on the auth screen; send them
  // where they were headed (or home). Covers landing here directly and the case
  // where a session is restored while the form is open.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(sanitizeNextPath(searchParams.get("next")));
    }
  }, [status, router, searchParams]);

  function switchMode(next: AuthMode) {
    setMode(next);
    otp.reset();
    // Full reset (not just clearErrors) so the new mode starts with a clean
    // slate: no carried-over values, touched, or submitted state that would
    // otherwise make the other mode's fields show errors before they're touched.
    reset();
  }

  async function onValid(values: AuthFormValues) {
    try {
      if (isRegister) {
        await register({
          email: values.email.trim(),
          username: values.username.trim(),
          password: values.password,
          acceptedRules: true,
          // Only sent in the two-step flow; omitted when verification is off so
          // the backend doesn't reject an empty code against its 6-digit rule.
          ...(emailVerification ? { code: values.code } : {}),
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

  if (forgot) {
    return (
      <div className="w-full max-w-[400px]">
        <ForgotPasswordForm
          initialEmail={getValues("identifier").trim()}
          onBackToLogin={() => setForgot(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      <AuthModeTabs mode={mode} onChange={switchMode} />

      <Text as="h1" variant="title" className="mb-1.5 text-center text-[23px]">
        {isRegister ? t("headingRegister") : t("headingLogin")}
      </Text>
      <Text variant="secondary" className="text-center text-sm mb-6">
        {isRegister ? t("subtitleRegister") : t("subtitleLogin")}
      </Text>

      <FormProvider {...methods}>
        <form
          // In the two-step register form step, submit (button or Enter) advances
          // to the OTP step rather than registering — the code isn't entered yet.
          // One-step register (verification off) submits straight through.
          onSubmit={
            twoStep && otp.step === "form"
              ? (e) => {
                  e.preventDefault();
                  void otp.handleContinue();
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
                icon={<Lock strokeWidth={1.8} aria-hidden />}
                surface="card"
                placeholder={t("password")}
                autoComplete="current-password"
                showLabel={t("showPassword")}
                hideLabel={t("hidePassword")}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setForgot(true)}
                className="-mt-1 self-end text-xs text-foreground-secondary transition-colors hover:text-foreground"
              >
                {t("forgotPassword")}
              </button>
            </>
          )}

          {isRegister && otp.step === "form" && (
            <>
              <RegisterFields disabled={otp.sending} />
              <PasswordField
                name="password"
                label={t("password")}
                srOnlyLabel
                icon={<Lock strokeWidth={1.8} aria-hidden />}
                surface="card"
                placeholder={t("password")}
                autoComplete="new-password"
                showLabel={t("showPassword")}
                hideLabel={t("hidePassword")}
                disabled={otp.sending}
              />
              <ConfirmPasswordField disabled={otp.sending} />
              <AcceptRulesField disabled={otp.sending} />
            </>
          )}

          {isRegister && otp.step === "otp" && (
            <OtpStep
              email={getValues("email").trim()}
              onResend={() => otp.sendCode(getValues("email").trim())}
              onChangeEmail={otp.backToForm}
              disabled={isSubmitting}
              devCode={otp.devCode}
            />
          )}

          {errors.root?.message && (
            <FormBanner tone="danger" role="alert">
              {errors.root.message}
            </FormBanner>
          )}

          <Button
            type="submit"
            loading={isSubmitting || otp.sending}
            className="w-full h-[50px] mt-2"
          >
            {isSubmitting || otp.sending
              ? t("pleaseWait")
              : !isRegister
                ? t("logIn")
                : twoStep && otp.step === "form"
                  ? t("continueStep")
                  : t("createAccount")}
          </Button>
        </form>
      </FormProvider>

      {/* OAuth is an alternative to the form above, so it's hidden once the
          register flow has advanced to entering the emailed code. */}
      {otp.step === "form" && <OAuthButtons />}

      <AuthTermsNote />
    </div>
  );
}
