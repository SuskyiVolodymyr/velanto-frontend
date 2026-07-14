/**
 * Client-side image cropping (avatars and pack covers). `react-easy-crop`
 * reports the chosen region in natural-image pixels (`croppedAreaPixels`); we
 * draw exactly that region onto a canvas and export a small WebP `File` that
 * flows through the normal `uploadMedia` path. The backend still re-encodes and
 * resizes per kind — cropping only decides *which* region (and aspect) it keeps.
 */

/** A region of the source image, in natural pixels (from react-easy-crop). */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropPlan {
  /** Whole-pixel source rectangle to read from the image. */
  source: CropArea;
  /** Output canvas width (px), scaled so the long edge fits the cap. */
  width: number;
  /** Output canvas height (px); preserves the crop's aspect ratio. */
  height: number;
}

/**
 * Cap the exported avatar at 512² — comfortably above the backend's 256² target
 * (so no quality loss) while keeping the upload tiny and well under the 1 MB cap.
 */
export const MAX_AVATAR_CROP = 512;

/**
 * Cap the exported cover at 1200 px on its long edge — matches the backend's
 * cover target so cropping doesn't throw away resolution, still well under 1 MB
 * as WebP.
 */
export const MAX_COVER_CROP = 1200;

/**
 * Turn a crop area into a concrete draw plan: whole-pixel source rectangle plus
 * the output dimensions, scaled so the long edge fits `max` (never upscaling)
 * while preserving the crop's aspect ratio. Pure — the geometry is the part
 * worth testing; the canvas draw in {@link cropImage} is browser-only glue.
 */
export function computeCrop(area: CropArea, max = MAX_AVATAR_CROP): CropPlan {
  const source = {
    x: Math.round(area.x),
    y: Math.round(area.y),
    width: Math.round(area.width),
    height: Math.round(area.height),
  };
  const longEdge = Math.max(source.width, source.height);
  const scale = longEdge > max ? max / longEdge : 1;
  return {
    source,
    width: Math.round(source.width * scale),
    height: Math.round(source.height * scale),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for cropping"));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas export failed")),
      "image/webp",
      0.9,
    );
  });
}

/**
 * Crop `file` to `area` and return a new WebP `File` ("crop.webp"). Loads the
 * file via an object URL, draws the source rectangle onto a canvas capped at
 * `maxDimension` on the long edge, and exports it. Always revokes the object
 * URL. `area` may be any aspect (square for avatars, 4:3 for covers).
 */
export async function cropImage(
  file: File,
  area: CropArea,
  maxDimension = MAX_AVATAR_CROP,
): Promise<File> {
  const { source, width, height } = computeCrop(area, maxDimension);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(
      img,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      width,
      height,
    );
    const blob = await canvasToBlob(canvas);
    return new File([blob], "crop.webp", { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
