"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { TextField } from "@/src/shared/components/form/TextField";
import { useAuth } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { ApiError } from "@/src/shared/lib/api-client";
import {
  addEmailSchema,
  type AddEmailValues,
} from "@/src/features/auth/auth.schema";

/**
 * Attach an email to an account that has none (e.g. a Discord sign-up). Two
 * steps, like register: enter the address and get a code, then enter the code to
 * confirm ownership. On success the auth user is patched so the address shows
 * immediately. Rendered by AccountSection only when the user has no email.
 */
export function AddEmailForm() {
  const t = useTranslations("settings");
  const { patchUser } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const methods = useForm<AddEmailValues>({
    mode: "onTouched",
    resolver: zodResolver(addEmailSchema),
    defaultValues: { email: "", code: "" },
  });
  const {
    handleSubmit,
    trigger,
    getValues,
    formState: { isSubmitting },
  } = methods;

  async function sendCode() {
    setSubmitError(null);
    if (!(await trigger("email"))) return;
    setSending(true);
    try {
      await authClient.requestEmailCode(getValues("email").trim());
      setStep("code");
    } catch {
      setSubmitError(t("addEmailSendError"));
    } finally {
      setSending(false);
    }
  }

  const onSubmit = async (values: AddEmailValues) => {
    setSubmitError(null);
    try {
      const { email } = await authClient.addEmail(
        values.email.trim(),
        values.code,
      );
      patchUser({ email });
    } catch (error) {
      setSubmitError(
        error instanceof ApiError && error.status === 403
          ? t("addEmailTaken")
          : t("addEmailError"),
      );
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={
          step === "email"
            ? (e) => {
                e.preventDefault();
                void sendCode();
              }
            : handleSubmit(onSubmit)
        }
        className="flex flex-col gap-3"
        noValidate
      >
        <TextField
          name="email"
          label={t("addEmailLabel")}
          type="email"
          autoComplete="email"
          disabled={step === "code" || sending}
        />
        {step === "code" && (
          <>
            <Text variant="secondary" className="text-sm">
              {t("addEmailCodeSent", { email: getValues("email").trim() })}
            </Text>
            <TextField
              name="code"
              label={t("addEmailCodeLabel")}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </>
        )}

        {submitError && (
          <Text variant="danger" className="text-sm">
            {submitError}
          </Text>
        )}

        <Button type="submit" loading={isSubmitting || sending} className="w-fit">
          {step === "email"
            ? t("addEmailSendButton")
            : t("addEmailConfirmButton")}
        </Button>
      </form>
    </FormProvider>
  );
}
