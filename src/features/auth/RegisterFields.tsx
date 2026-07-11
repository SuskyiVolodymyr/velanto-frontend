"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { TextField } from "@/src/shared/components/form/TextField";
import { PasswordField } from "@/src/shared/components/form/PasswordField";
import { CheckboxField } from "@/src/shared/components/form/CheckboxField";

/**
 * Register-only field block that sits above the shared password field: the
 * username and email inputs. Presentational — reads RHF context via each
 * TextField's `name`.
 */
export function RegisterFields({ disabled }: { disabled: boolean }) {
  const t = useTranslations("auth");
  return (
    <>
      <TextField
        name="username"
        label={t("username")}
        srOnlyLabel
        placeholder={t("username")}
        autoComplete="username"
        disabled={disabled}
      />
      <TextField
        name="email"
        label={t("email")}
        srOnlyLabel
        type="email"
        placeholder={t("email")}
        autoComplete="email"
        disabled={disabled}
      />
    </>
  );
}

/**
 * Register-only confirm-password input that sits directly below the shared
 * password field. Kept separate from RegisterFields because the shared password
 * field renders between them in the DOM. The match is enforced by
 * `registerSchema`, which reports a mismatch on this field.
 */
export function ConfirmPasswordField({ disabled }: { disabled: boolean }) {
  const t = useTranslations("auth");
  return (
    <PasswordField
      name="confirmPassword"
      label={t("confirmPassword")}
      srOnlyLabel
      placeholder={t("confirmPassword")}
      autoComplete="new-password"
      showLabel={t("showPassword")}
      hideLabel={t("hidePassword")}
      disabled={disabled}
    />
  );
}

/**
 * Register-only accept-rules checkbox that sits below the shared password field.
 * Kept a separate component from RegisterFields because the shared password
 * field renders between them in the DOM.
 */
export function AcceptRulesField({ disabled }: { disabled: boolean }) {
  const t = useTranslations("auth");
  return (
    <CheckboxField
      name="acceptedRules"
      disabled={disabled}
      label={t.rich("acceptRules", {
        link: (chunks) => (
          <Link
            href="/rules"
            target="_blank"
            rel="noopener noreferrer"
            className="text-acc underline hover:no-underline"
            onClick={(e) => e.stopPropagation()}
          >
            {chunks}
          </Link>
        ),
      })}
    />
  );
}
