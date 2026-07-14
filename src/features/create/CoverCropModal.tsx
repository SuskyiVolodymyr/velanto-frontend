"use client";

import { useTranslations } from "next-intl";
import { ImageCropModal } from "@/src/shared/components/ImageCropModal";
import { MAX_COVER_CROP } from "@/src/shared/lib/crop-image";

/**
 * Cover-configured {@link ImageCropModal}: a 4:3 rectangular crop (matching the
 * feed card) capped at 1200 px, labelled from the `create` catalog. Picking a
 * cover opens this; Save hands back a cropped WebP the field uploads.
 */
export function CoverCropModal({
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
  const t = useTranslations("create");
  return (
    <ImageCropModal
      file={file}
      open={open}
      onCancel={onCancel}
      onCropped={onCropped}
      aspect={4 / 3}
      cropShape="rect"
      maxDimension={MAX_COVER_CROP}
      title={t("coverCropTitle")}
      zoomLabel={t("coverCropZoom")}
      cancelLabel={t("coverCropCancel")}
      saveLabel={t("coverCropSave")}
      errorText={t("coverCropError")}
    />
  );
}
