import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { messageFromError } from "@/utils/messageFromError";
import type { AuthFormValues } from "@/features/auth/auth.schema";
import {
  markCodeSent,
  getResendCooldownRemaining,
} from "@/features/auth/otp-cooldown";

// Register is two steps: fill the form, then enter the emailed code.
export type Step = "form" | "otp";

// Fields validated before leaving the register form for the OTP step (the
// `code` isn't entered yet, so it's excluded here).
const FORM_STEP_FIELDS = [
  "username",
  "email",
  "password",
  "confirmPassword",
  "acceptedRules",
] as const;

export interface UseRegisterOtpOptions {
  methods: UseFormReturn<AuthFormValues>;
  requestEmailCode: (email: string) => Promise<{ devCode?: string }>;
  /** Called when sending fails, so the card can shake. */
  onFailure: () => void;
}

/**
 * The two-step register flow: validate the form fields, send an email code,
 * advance to the OTP step.
 *
 * Takes `methods` rather than reading `useFormContext`, because AuthForm renders
 * its own `FormProvider` below this call — the context does not exist yet here.
 */
export function useRegisterOtp({
  methods,
  requestEmailCode,
  onFailure,
}: UseRegisterOtpOptions) {
  const { trigger, getValues, setValue, setError } = methods;
  const [step, setStep] = useState<Step>("form");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);

  // Send a code unless one was sent recently (cooldown persists across refresh),
  // so re-entering the form for the same email reuses the still-valid code
  // instead of tripping the backend's resend throttle.
  async function sendCode(email: string) {
    if (getResendCooldownRemaining(email) > 0) return;
    const { devCode: dev } = await requestEmailCode(email);
    markCodeSent(email);
    setDevCode(dev);
  }

  async function handleContinue() {
    const ok = await trigger(FORM_STEP_FIELDS);
    if (!ok) {
      // Continue is a submit-like action, so reveal every blocking error — even
      // on fields the user never focused (e.g. an unchecked rules box), which
      // the touched-gated display would otherwise keep hidden.
      for (const name of FORM_STEP_FIELDS) {
        setValue(name, getValues(name), { shouldTouch: true });
      }
      return;
    }
    const email = getValues("email").trim();
    setSending(true);
    try {
      await sendCode(email);
      setStep("otp");
    } catch (err) {
      setError("root", { message: messageFromError(err) });
      onFailure();
    } finally {
      setSending(false);
    }
  }

  /** Back to a clean first step — used when switching login/register tabs. */
  function reset() {
    setStep("form");
    setDevCode(undefined);
  }

  return {
    step,
    backToForm: () => setStep("form"),
    devCode,
    sending,
    sendCode,
    handleContinue,
    reset,
  };
}
