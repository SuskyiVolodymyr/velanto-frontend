"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { TextField } from "@/src/shared/components/form/TextField";
import { CheckboxField } from "@/src/shared/components/form/CheckboxField";

/**
 * Register-only field block that sits above the shared password field: the
 * username and email inputs. Presentational — reads RHF context via each
 * TextField's `name`.
 */
export function RegisterFields({ disabled }: { disabled: boolean }) {
  return (
    <>
      <TextField
        name="username"
        label="Username"
        srOnlyLabel
        placeholder="Username"
        autoComplete="username"
        disabled={disabled}
      />
      <TextField
        name="email"
        label="Email"
        srOnlyLabel
        type="email"
        placeholder="Email"
        autoComplete="email"
        disabled={disabled}
      />
    </>
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
