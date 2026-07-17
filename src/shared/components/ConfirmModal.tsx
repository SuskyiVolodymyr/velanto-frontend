"use client";

import { Modal } from "@/src/shared/components/Modal";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** While true, the confirm request is in flight: both actions lock and the
   * confirm button shows a spinner so an impatient double-click can't re-fire. */
  confirming?: boolean;
  /** A failed confirm attempt's message, surfaced inline so the user can retry
   * without losing the dialog. */
  error?: string | null;
}

/**
 * A yes/no confirmation dialog for a destructive action, built on {@link Modal}.
 * The confirm button is danger-styled; the whole thing is controlled by the
 * caller (open state, in-flight state, error).
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirming = false,
  error,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <Text variant="secondary" className="text-sm leading-relaxed">
        {message}
      </Text>

      {error && (
        <Text variant="danger" role="alert" className="mt-3 text-sm">
          {error}
        </Text>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={confirming}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={confirming}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
