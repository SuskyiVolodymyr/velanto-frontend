"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";
import { Modal } from "@/src/shared/components/Modal";
import { useAuth } from "@/src/shared/lib/auth-context";
import { authClient } from "@/src/shared/lib/auth-client";
import { ApiError } from "@/src/shared/lib/api-client";

/**
 * "Danger zone" on /settings: export ("download my data") and account deletion.
 * Deletion is a soft-delete (30-day grace) that requires the current password,
 * confirmed in a modal; on success the client session is cleared and the user is
 * sent home.
 */
export function DangerZoneSection() {
  const t = useTranslations("settings");
  const { status, logout } = useAuth();
  const router = useRouter();

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (status !== "authenticated") return null;

  const handleExport = async () => {
    setExporting(true);
    setExportError(false);
    try {
      const data = await authClient.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "velanto-data.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await authClient.deleteAccount(password);
      await logout();
      router.push("/");
    } catch (error) {
      // A 400 means the password didn't match — say so; else a generic message.
      setDeleteError(
        error instanceof ApiError && error.status === 400
          ? t("deleteAccountWrongPassword")
          : t("deleteAccountError"),
      );
      setDeleting(false);
    }
  };

  const closeModal = () => {
    if (deleting) return;
    setModalOpen(false);
    setPassword("");
    setDeleteError(null);
  };

  return (
    <section className="flex flex-col gap-4">
      {/*
        `variant="danger"`, not tertiary + a text-danger className: cn() appends
        rather than merges, so the colour in className never won and this
        heading has been rendering dim grey instead of red (#236).
      */}
      <Text
        as="h2"
        variant="danger"
        className="text-xs uppercase tracking-wide"
      >
        {t("dangerHeading")}
      </Text>

      <Card className="flex flex-col gap-6 hover:translate-y-0 hover:shadow-none">
        {/* Data export */}
        <div className="flex flex-col gap-2">
          <Text className="font-semibold">{t("exportDataButton")}</Text>
          <Text variant="secondary" className="text-sm">
            {t("exportDataDescription")}
          </Text>
          <div>
            <Button
              variant="secondary"
              onClick={handleExport}
              loading={exporting}
            >
              {t("exportDataButton")}
            </Button>
          </div>
          {exportError && (
            <Text variant="danger" className="text-sm" role="alert">
              {t("exportDataError")}
            </Text>
          )}
        </div>

        <div className="h-px w-full bg-border" />

        {/* Account deletion */}
        <div className="flex flex-col gap-2">
          <Text className="font-semibold">{t("deleteAccountButton")}</Text>
          <Text variant="secondary" className="text-sm">
            {t("deleteAccountDescription")}
          </Text>
          <div>
            <Button variant="danger" onClick={() => setModalOpen(true)}>
              {t("deleteAccountButton")}
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t("deleteAccountModalTitle")}
      >
        <Text variant="secondary" className="text-sm leading-relaxed">
          {t("deleteAccountModalWarning")}
        </Text>

        <label className="mt-4 flex flex-col gap-1.5">
          <Text variant="secondary" className="text-sm">
            {t("deleteAccountPasswordLabel")}
          </Text>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={deleting}
          />
        </label>

        {deleteError && (
          <Text variant="danger" role="alert" className="mt-3 text-sm">
            {deleteError}
          </Text>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={closeModal} disabled={deleting}>
            {t("deleteAccountCancel")}
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
            disabled={password.length === 0}
          >
            {t("deleteAccountConfirm")}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
