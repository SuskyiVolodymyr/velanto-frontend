"use client";

import { useState } from "react";
import { cn } from "@/src/shared/lib/cn";

/**
 * The `<img>` half of {@link UserAvatar}, split out as a client component so it
 * can degrade to the initial on a load error — a stored avatar key can resolve
 * to a 404 (the object was swept after a ban/replace, or NEXT_PUBLIC_MEDIA_BASE_URL
 * isn't configured yet and the key resolves to a dead relative path). Without
 * this the viewer would get the browser's broken-image glyph instead of the
 * initials placeholder. Remount (via a `key` on the src) resets the error state.
 */
export function AvatarImage({
  src,
  initial,
  className,
}: {
  src: string;
  initial: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center justify-center font-semibold",
          className,
        )}
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- CDN-resolved avatar; Next <Image> needs remote-loader config and adds no value for this small, already-processed thumbnail
    <img
      src={src}
      alt=""
      aria-hidden
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
