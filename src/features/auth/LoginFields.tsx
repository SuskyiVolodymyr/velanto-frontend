"use client";

import { useTranslations } from "next-intl";
import { TextField } from "@/src/shared/components/form/TextField";

/**
 * Login-only field block: the single identifier (email-or-username) field.
 * Presentational — reads RHF context via TextField's `name`.
 */
export function LoginFields({ disabled }: { disabled: boolean }) {
  const t = useTranslations("auth");
  return (
    <TextField
      name="identifier"
      label={t("identifier")}
      srOnlyLabel
      placeholder={t("identifier")}
      autoComplete="username"
      disabled={disabled}
    />
  );
}
