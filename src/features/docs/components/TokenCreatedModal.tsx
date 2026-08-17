"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Text } from "@/ui/Text";
import { Button } from "@/ui/Button";
import { Modal } from "@/ui/Modal";
import type { CreatedApiToken } from "@/api/tokens-client";

export interface TokenCreatedModalProps {
  /** The minted token, or null when nothing has just been created. */
  token: CreatedApiToken | null;
  onClose: () => void;
}

/**
 * A minted token's secret, shown exactly once. `copied` resets with the modal,
 * so reopening after a second mint never claims the new secret is on the
 * clipboard.
 */
export function TokenCreatedModal({ token, onClose }: TokenCreatedModalProps) {
  const t = useTranslations("docs");
  const [copied, setCopied] = useState(false);

  const close = () => {
    setCopied(false);
    onClose();
  };

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.plaintext);
      setCopied(true);
    } catch {
      // Clipboard denied (e.g. insecure context) — the token is visible for
      // manual selection, so this is a non-fatal degradation.
    }
  };

  return (
    <Modal open={token !== null} onClose={close} title={t("tokenCreatedTitle")}>
      <Text variant="secondary" className="text-sm leading-relaxed">
        {t("tokenCreatedWarning")}
      </Text>
      <code className="mt-4 block w-full break-all rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm">
        {token?.plaintext}
      </code>
      <div className="mt-4 flex justify-end gap-3">
        <Button variant="secondary" onClick={() => void handleCopy()}>
          {copied ? t("tokenCopied") : t("tokenCopy")}
        </Button>
        <Button onClick={close}>{t("tokenCreatedDone")}</Button>
      </div>
    </Modal>
  );
}
