"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { Modal } from "@/src/shared/components/Modal";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cropImage, type CropArea } from "@/src/shared/lib/crop-image";

export interface ImageCropModalProps {
  file: File;
  open: boolean;
  onCancel: () => void;
  onCropped: (cropped: File) => void;
  /** Crop aspect ratio (1 for avatars, 4/3 for covers). */
  aspect: number;
  /** "round" for avatars, "rect" for covers. */
  cropShape: "round" | "rect";
  /** Long-edge cap for the exported image (px). */
  maxDimension: number;
  title: string;
  zoomLabel: string;
  cancelLabel: string;
  saveLabel: string;
  errorText: string;
}

/**
 * Generic crop-before-upload modal: shows the picked file in `react-easy-crop`
 * (with the given aspect/shape), and on Save produces a cropped WebP `File` via
 * {@link cropImage} and hands it back. Configured by the avatar and cover
 * wrappers; cropping is client-side, the backend still re-encodes.
 */
export function ImageCropModal({
  file,
  open,
  onCancel,
  onCropped,
  aspect,
  cropShape,
  maxDimension,
  title,
  zoomLabel,
  cancelLabel,
  saveLabel,
  errorText,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Preview URL for the picked file. Create AND revoke inside one effect: this
  // is leak-free and StrictMode-safe (the dev double-mount revokes the first URL
  // and the re-run mints a fresh, live one). Deriving it in render leaves state
  // pointing at a URL the cleanup already revoked, so the image never loads.
  const [imageUrl, setImageUrl] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-resource sync: the object URL must be created and revoked in the same effect (canonical leak-free, StrictMode-safe pattern); deriving it in render breaks under StrictMode.
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleCropComplete = useCallback(
    (_area: CropArea, pixels: CropArea) => setArea(pixels),
    [],
  );

  async function handleSave() {
    if (!area || busy) return;
    setBusy(true);
    setError("");
    try {
      const cropped = await cropImage(file, area, maxDimension);
      onCropped(cropped);
    } catch {
      setError(errorText);
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
    <Modal open={open} onClose={handleClose} title={title} className="max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="relative h-64 w-full overflow-hidden rounded-[12px] bg-black/40">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>
        <label className="flex items-center gap-3">
          <Text variant="secondary" className="text-xs">
            {zoomLabel}
          </Text>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            aria-label={zoomLabel}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-acc"
          />
        </label>
        {error && (
          <Text variant="danger" role="alert" className="text-sm">
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
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            loading={busy}
            disabled={!area || busy}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
