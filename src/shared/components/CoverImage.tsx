"use client";

import { useState } from "react";
import { mediaUrl } from "@/src/shared/lib/media-url";
import { cn } from "@/src/shared/lib/cn";

/**
 * Decorative custom pack cover, mirroring {@link AvatarImage}: a client `<img>`
 * that fills its (positioned) parent and, on a load error, unmounts itself so the
 * parent's gradient `coverTone` shows through. A stored cover key can 404 (the
 * object was swept, or NEXT_PUBLIC_MEDIA_BASE_URL isn't configured and the key
 * resolves to a dead relative path); without this the viewer would get the
 * browser's broken-image glyph over the card instead of the intended gradient.
 *
 * `alt=""` + `aria-hidden` keep it purely decorative so it doesn't fight the
 * card / hero semantics (title, format badge, author are the real content).
 */
export function CoverImage({
  coverKey,
  className,
}: {
  coverKey: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- CDN-resolved cover; Next <Image> needs remote-loader config and adds no value for this decorative, already-processed image
    <img
      src={mediaUrl(coverKey)}
      alt=""
      aria-hidden
      onError={() => setFailed(true)}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
