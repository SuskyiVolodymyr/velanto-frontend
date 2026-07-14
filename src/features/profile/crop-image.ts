/**
 * Client-side avatar cropping. `react-easy-crop` reports the chosen region in
 * natural-image pixels (`croppedAreaPixels`); we draw exactly that square onto a
 * canvas and export a small WebP `File` that flows through the normal
 * `uploadMedia(file, "avatar")` path. The backend still re-encodes to a 256²
 * WebP — cropping only decides *which* square it keeps.
 */

/** A square region of the source image, in natural pixels (from react-easy-crop). */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropPlan {
  /** Whole-pixel source rectangle to read from the image. */
  source: CropArea;
  /** Output canvas edge length (square), capped so the file stays small. */
  size: number;
}

/**
 * Cap the exported avatar at 512² — comfortably above the backend's 256² target
 * (so no quality loss) while keeping the upload tiny and well under the 1 MB cap.
 */
export const MAX_AVATAR_CROP = 512;

/**
 * Turn a crop area into a concrete draw plan: whole-pixel source rectangle plus
 * the (capped) output size. Pure — the geometry is the part worth testing; the
 * canvas draw in {@link cropImage} is browser-only glue.
 */
export function computeCrop(area: CropArea, max = MAX_AVATAR_CROP): CropPlan {
  const source = {
    x: Math.round(area.x),
    y: Math.round(area.y),
    width: Math.round(area.width),
    height: Math.round(area.height),
  };
  return { source, size: Math.min(source.width, max) };
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
 * Crop `file` to the square `area` and return a new WebP `File` ("avatar.webp").
 * Loads the file via an object URL, draws the source rectangle onto a capped
 * square canvas, and exports it. Always revokes the object URL.
 */
export async function cropImage(file: File, area: CropArea): Promise<File> {
  const { source, size } = computeCrop(area);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
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
      size,
      size,
    );
    const blob = await canvasToBlob(canvas);
    return new File([blob], "avatar.webp", { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
