"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { PasswordField } from "@/src/shared/components/form/PasswordField";
import { useAuth } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import {
  setPasswordSchema,
  type SetPasswordValues,
} from "@/src/features/auth/auth.schema";

/**
 * Set a FIRST password on an OAuth-only account (no current password exists to
 * confirm). Shown by PasswordSection when the signed-in user has no password.
 * On success the auth user is patched (`hasPassword: true`) so the section
 * switches to the normal change-password form without a reload.
 */
export function SetPasswordSection() {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const { patchUser } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const methods = useForm<SetPasswordValues>({
    mode: "onTouched",
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const { isSubmitting } = methods.formState;

  const onSubmit = async (values: SetPasswordValues) => {
    setSubmitError(null);
    try {
      await authClient.setPassword(values.newPassword);
      methods.reset();
      // Flip the section to change-password mode; also reflects that the account
      // now has a password everywhere else that reads it.
      patchUser({ hasPassword: true });
    } catch {
      setSubmitError(t("setPasswordError"));
    }
  };

  return (
    <Card>
      <Text as="h2" variant="title" className="mb-1 text-lg">
        {t("setPasswordHeading")}
      </Text>
      <Text variant="secondary" className="mb-4 text-sm">
        {t("setPasswordDescription")}
      </Text>
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className="flex max-w-md flex-col gap-4"
          noValidate
        >
          <PasswordField
            name="newPassword"
            label={t("newPassword")}
            autoComplete="new-password"
            showLabel={tAuth("showPassword")}
            hideLabel={tAuth("hidePassword")}
          />
          <PasswordField
            name="confirmPassword"
            label={t("confirmNewPassword")}
            autoComplete="new-password"
            showLabel={tAuth("showPassword")}
            hideLabel={tAuth("hidePassword")}
          />

          {submitError && (
            <Text variant="danger" className="text-sm">
              {submitError}
            </Text>
          )}

          <Button type="submit" loading={isSubmitting} className="w-fit">
            {t("setPasswordButton")}
          </Button>
        </form>
      </FormProvider>
    </Card>
  );
}
