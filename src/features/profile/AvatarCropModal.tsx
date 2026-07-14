"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { useTranslations } from "next-intl";
import { Modal } from "@/src/shared/components/Modal";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cropImage, type CropArea } from "./crop-image";

/**
 * Modal that lets the user frame a square avatar from a picked file before
 * upload. Wraps `react-easy-crop` (circular guide, drag-to-pan + zoom); on Save
 * it produces a cropped WebP `File` via {@link cropImage} and hands it back — the
 * caller runs the existing upload mutation with it. Cropping is client-side; the
 * backend still re-encodes to a 256² WebP.
 */
export function AvatarCropModal({
  file,
  open,
  onCancel,
  onCropped,
}: {
  file: File;
  open: boolean;
  onCancel: () => void;
  onCropped: (cropped: File) => void;
}) {
  const t = useTranslations("profile");
  const [imageUrl, setImageUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Preview the picked file via an object URL, revoked when the modal closes or
  // the file changes so we never leak it.
  useEffect(() => {
    if (!open) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setImageUrl("");
    };
  }, [open, file]);

  // Stable so react-easy-crop's effect deps don't churn every render.
  const handleCropComplete = useCallback(
    (_area: CropArea, pixels: CropArea) => setArea(pixels),
    [],
  );

  async function handleSave() {
    if (!area || busy) return;
    setBusy(true);
    setError("");
    try {
      const cropped = await cropImage(file, area);
      onCropped(cropped);
    } catch {
      setError(t("avatarCropError"));
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t("avatarCropTitle")}
      className="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <div className="relative h-64 w-full overflow-hidden rounded-[12px] bg-black/40">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>
        <label className="flex items-center gap-3">
          <Text variant="secondary" className="text-xs">
            {t("avatarCropZoom")}
          </Text>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            aria-label={t("avatarCropZoom")}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-acc"
          />
        </label>
        {error && (
          <Text role="alert" className="text-sm text-danger">
            {error}
          </Text>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={busy}
          >
            {t("avatarCropCancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            loading={busy}
            disabled={!area || busy}
          >
            {t("save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
