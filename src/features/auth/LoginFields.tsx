"use client";

import { TextField } from "@/src/shared/components/form/TextField";

/**
 * Login-only field block: the single identifier (email-or-username) field.
 * Presentational — reads RHF context via TextField's `name`.
 */
export function LoginFields({ disabled }: { disabled: boolean }) {
  return (
    <TextField
      name="identifier"
      label="Email or username"
      srOnlyLabel
      placeholder="Email or username"
      autoComplete="username"
      disabled={disabled}
    />
  );
}
