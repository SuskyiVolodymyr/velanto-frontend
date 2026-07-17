"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { TextField } from "@/src/shared/components/form/TextField";
import { PasswordField } from "@/src/shared/components/form/PasswordField";
import { authClient } from "@/src/shared/lib/auth-client";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/src/features/auth/auth.schema";

type Step = "request" | "confirm" | "done";

/**
 * Forgot-password flow: request a 6-digit code for an email, then set a new
 * password with it. Rendered in place of the login/register tabs on /auth. One
 * form holds every field; step 1 only validates `email` (via `trigger`), step 2
 * validates the rest on submit. In dev the request echoes the code back, which
 * we prefill so the flow is completable without reading server logs.
 */
export function ForgotPasswordForm({
  initialEmail = "",
  onBackToLogin,
}: {
  initialEmail?: string;
  onBackToLogin: () => void;
}) {
  const t = useTranslations("auth");
  const [step, setStep] = useState<Step>("request");
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const methods = useForm<ResetPasswordValues>({
    mode: "onTouched",
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const { isSubmitting } = methods.formState;

  const handleRequest = async () => {
    setSubmitError(null);
    if (!(await methods.trigger("email"))) return;
    setSending(true);
    try {
      const { devCode } = await authClient.requestPasswordReset(
        methods.getValues("email"),
      );
      if (devCode) methods.setValue("code", devCode);
      setStep("confirm");
    } catch {
      // The request endpoint is anti-enumeration and shouldn't 4xx on a real
      // email, but a network/500 still lands here.
      setSubmitError(t("resetError"));
    } finally {
      setSending(false);
    }
  };

  const onConfirm = async (values: ResetPasswordValues) => {
    setSubmitError(null);
    try {
      await authClient.resetPassword({
        email: values.email,
        code: values.code,
        newPassword: values.newPassword,
      });
      setStep("done");
    } catch {
      setSubmitError(t("resetError"));
    }
  };

  if (step === "done") {
    return (
      <div className="flex flex-col gap-4 text-center">
        <Text as="h1" variant="title" className="text-2xl">
          {t("resetHeading")}
        </Text>
        <Text variant="secondary" className="text-sm" role="status">
          {t("resetSuccess")}
        </Text>
        <Button type="button" onClick={onBackToLogin} className="w-full">
          {t("backToLogin")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Text as="h1" variant="title" className="mb-1.5 text-center text-2xl">
        {t("resetHeading")}
      </Text>
      <Text variant="secondary" className="mb-6 text-center text-sm">
        {step === "request" ? t("resetIntro") : t("resetCodeSent")}
      </Text>

      <FormProvider {...methods}>
        <form
          onSubmit={
            step === "request"
              ? (event) => {
                  event.preventDefault();
                  void handleRequest();
                }
              : methods.handleSubmit(onConfirm)
          }
          noValidate
          className="flex flex-col gap-3"
        >
          <TextField
            name="email"
            type="email"
            label={t("email")}
            autoComplete="email"
            disabled={step !== "request"}
          />

          {step === "confirm" && (
            <>
              <TextField
                name="code"
                inputMode="numeric"
                label={t("resetEnterCode")}
                autoComplete="one-time-code"
              />
              <PasswordField
                name="newPassword"
                label={t("resetNewPassword")}
                autoComplete="new-password"
                showLabel={t("showPassword")}
                hideLabel={t("hidePassword")}
              />
              <PasswordField
                name="confirmPassword"
                label={t("resetConfirmPassword")}
                autoComplete="new-password"
                showLabel={t("showPassword")}
                hideLabel={t("hidePassword")}
              />
            </>
          )}

          {submitError && (
            <Text variant="danger" className="text-sm">
              {submitError}
            </Text>
          )}

          <Button
            type="submit"
            loading={step === "request" ? sending : isSubmitting}
            className="mt-1 w-full"
          >
            {step === "request" ? t("sendResetCode") : t("resetSubmit")}
          </Button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="mt-1 text-center text-sm text-foreground-secondary transition-colors hover:text-foreground"
          >
            {t("backToLogin")}
          </button>
        </form>
      </FormProvider>
    </>
  );
}
