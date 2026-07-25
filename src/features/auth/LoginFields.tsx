"use client";

import { useTranslations } from "next-intl";
import { User } from "lucide-react";
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
      icon={<User strokeWidth={1.8} aria-hidden />}
      surface="card"
      placeholder={t("identifier")}
      autoComplete="username"
      disabled={disabled}
    />
  );
}
