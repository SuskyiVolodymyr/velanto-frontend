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
import { ApiError } from "@/src/shared/lib/api-client";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/src/features/auth/auth.schema";

/**
 * Change-password section on /settings: current + new + confirm, validated with
 * the shared password rules. Requires the current password (the server checks
 * it), so a stray open session can't silently reset the credential. On success
 * the form clears and a confirmation shows; a wrong current password surfaces a
 * specific message, anything else a generic one.
 */
export function PasswordSection() {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const { status } = useAuth();
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const methods = useForm<ChangePasswordValues>({
    mode: "onTouched",
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const { isSubmitting } = methods.formState;

  if (status !== "authenticated") {
    return (
      <Card>
        <Text as="h2" variant="title" className="mb-1 text-lg">
          {t("passwordHeading")}
        </Text>
        <Text variant="secondary" className="text-sm">
          {t("loginToChangePassword")}
        </Text>
      </Card>
    );
  }

  const onSubmit = async (values: ChangePasswordValues) => {
    setSubmitError(null);
    setDone(false);
    try {
      await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      methods.reset();
      setDone(true);
    } catch (error) {
      // A 400 means the current password didn't match — say so specifically;
      // everything else gets the generic message.
      setSubmitError(
        error instanceof ApiError && error.status === 400
          ? t("currentPasswordWrong")
          : t("changePasswordError"),
      );
    }
  };

  return (
    <Card>
      <Text as="h2" variant="title" className="mb-4 text-lg">
        {t("passwordHeading")}
      </Text>
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className="flex max-w-md flex-col gap-4"
          noValidate
        >
          <PasswordField
            name="currentPassword"
            label={t("currentPassword")}
            autoComplete="current-password"
            showLabel={tAuth("showPassword")}
            hideLabel={tAuth("hidePassword")}
          />
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
            <Text className="text-sm text-danger">{submitError}</Text>
          )}
          {done && (
            <Text className="text-sm text-success" role="status">
              {t("passwordChanged")}
            </Text>
          )}

          <Button type="submit" loading={isSubmitting} className="w-fit">
            {t("changePasswordButton")}
          </Button>
        </form>
      </FormProvider>
    </Card>
  );
}
