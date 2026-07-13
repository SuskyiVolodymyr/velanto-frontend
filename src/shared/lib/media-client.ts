import { apiClient } from "@/src/shared/lib/api-client";

/**
 * Media kinds the backend `POST /media` endpoint accepts. FE-LOCAL: the backend
 * owns the canonical `MEDIA_KINDS` list — do NOT mirror this in
 * cross-repo-drift.test.ts (only wire-contract closed sets that both repos
 * enumerate live there).
 */
export type MediaKind = "item" | "avatar" | "cover";

export interface UploadedMedia {
  /** S3 storage key, e.g. "media/item/<uuid>.webp". Stored as the item value. */
  key: string;
  /** Public render URL, usable immediately for a preview. */
  url: string;
  byteSize: number;
}

/**
 * Largest image the backend accepts (1 MB). Enforced client-side too so an
 * oversized file is rejected before the upload round-trip.
 */
export const MEDIA_MAX_BYTES = 1024 * 1024;

/**
 * Uploads an image to the media endpoint, which processes it to WebP and returns
 * its storage key + public URL. Sends `file` + `kind` as multipart form data via
 * the shared api-client (same credentials/auth as every other authed call).
 */
export function uploadMedia(
  file: File,
  kind: MediaKind,
): Promise<UploadedMedia> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);
  return apiClient.postForm<UploadedMedia>("/media", formData);
}
