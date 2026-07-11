"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { TextField } from "@/src/shared/components/form/TextField";
import { getResendCooldownRemaining } from "./otp-cooldown";

/**
 * Second step of registration (verify-before-create): the one-time password
 * entry. Shows which email the code went to, a spam-folder hint, the 6-digit
 * code field, a resend button gated by a 60s cooldown that persists across
 * refresh (see {@link getResendCooldownRemaining}), and a way back to edit the
 * email. In dev the backend echoes the code, which is surfaced here so manual
 * testing doesn't need a real inbox.
 */
export function OtpStep({
  email,
  onResend,
  onChangeEmail,
  disabled,
  devCode,
}: {
  email: string;
  /** Requests a fresh code; should re-mark the cooldown on success. */
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
  disabled: boolean;
  devCode?: string;
}) {
  const t = useTranslations("auth");
  const [cooldown, setCooldown] = useState(() =>
    getResendCooldownRemaining(email),
  );
  const [resending, setResending] = useState(false);

  // Tick the countdown down once a second while it's active.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown(getResendCooldownRemaining(email));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown, email]);

  async function handleResend() {
    setResending(true);
    try {
      await onResend();
      setCooldown(getResendCooldownRemaining(email));
    } finally {
      setResending(false);
    }
  }

  const resendDisabled = cooldown > 0 || resending || disabled;

  return (
    <div className="flex flex-col gap-3">
      <Text variant="secondary" className="text-sm">
        {t("otpSentTo", { email })}
      </Text>

      <TextField
        name="code"
        label={t("verificationCode")}
        srOnlyLabel
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder={t("verificationCode")}
        disabled={disabled}
      />

      {devCode && (
        <Text variant="tertiary" className="text-xs">
          Dev code: <span className="font-mono">{devCode}</span>
        </Text>
      )}

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onChangeEmail}
          disabled={disabled}
          className="text-foreground-secondary underline transition-colors hover:text-foreground disabled:opacity-45"
        >
          {t("changeEmail")}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendDisabled}
          className="text-acc underline transition-colors hover:no-underline disabled:opacity-45 disabled:no-underline"
        >
          {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resend")}
        </button>
      </div>

      <Text variant="tertiary" className="text-xs">
        {t("checkSpam")}
      </Text>
    </div>
  );
}
