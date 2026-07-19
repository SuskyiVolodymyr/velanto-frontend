"use client";

import { useTranslations } from "next-intl";
import { ImageCropModal } from "@/src/shared/components/ImageCropModal";
import { MAX_ITEM_CROP } from "@/src/shared/lib/crop-image";

/**
 * Item-configured {@link ImageCropModal}: a 16:9 rectangular crop matching the
 * play-time `ImageCard`, so an author can reframe an image the round would
 * otherwise centre-crop. Opt-in per image (the default centre-crop already
 * works). Reuses the generic cover-crop labels for Zoom/Cancel/Save/error.
 */
export function ItemImageCropModal({
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
      aspect={16 / 9}
      cropShape="rect"
      maxDimension={MAX_ITEM_CROP}
      title={t("itemCropTitle")}
      zoomLabel={t("coverCropZoom")}
      cancelLabel={t("coverCropCancel")}
      saveLabel={t("coverCropSave")}
      errorText={t("coverCropError")}
    />
  );
}
