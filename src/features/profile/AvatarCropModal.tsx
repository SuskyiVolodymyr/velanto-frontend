"use client";

import { useTranslations } from "next-intl";
import { ImageCropModal } from "@/src/shared/components/ImageCropModal";
import { MAX_AVATAR_CROP } from "@/src/shared/lib/crop-image";

/**
 * Avatar-configured {@link ImageCropModal}: a square, circular crop capped at
 * 512 px, labelled from the `profile` catalog. Picking a photo opens this; Save
 * hands back a cropped WebP the caller uploads via the existing avatar mutation.
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
  return (
    <ImageCropModal
      file={file}
      open={open}
      onCancel={onCancel}
      onCropped={onCropped}
      aspect={1}
      cropShape="round"
      maxDimension={MAX_AVATAR_CROP}
      title={t("avatarCropTitle")}
      zoomLabel={t("avatarCropZoom")}
      cancelLabel={t("avatarCropCancel")}
      saveLabel={t("save")}
      errorText={t("avatarCropError")}
    />
  );
}
