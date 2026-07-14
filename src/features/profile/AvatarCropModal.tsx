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
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Preview URL for the picked file. Create AND revoke inside one effect: this
  // is leak-free and, crucially, StrictMode-safe. React's dev double-mount runs
  // the cleanup (revoking the URL) then re-runs the effect to mint a fresh, live
  // one. Deriving the URL during render (useMemo / lazy state) instead leaves
  // state pointing at a URL the double-mount cleanup already revoked, so the
  // cropper image never loads.
  const [imageUrl, setImageUrl] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-resource sync: an object URL must be created and revoked in the same effect (the canonical leak-free, StrictMode-safe pattern); deriving it in render breaks under StrictMode.
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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

  // Block every dismissal path (Escape / backdrop / ✕ / Cancel) while a crop is
  // encoding, so an in-flight crop can't be silently cancelled after Save —
  // otherwise the modal unmounts but the pending crop still resolves and uploads.
  function handleClose() {
    if (!busy) onCancel();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
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
            onClick={handleClose}
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
