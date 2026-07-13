import { cn } from "@/src/shared/lib/cn";
import { Badge } from "@/src/shared/components/Badge";

interface ImageCardProps {
  /** Fully-resolved render URL (build it from a stored key via mediaUrl). */
  src: string;
  /** Meaningful alternative text — pass the item's title. */
  alt: string;
  className?: string;
}

/**
 * The play-time media slot for a pack `image` item — the still-image counterpart
 * to {@link YouTubeCard}. Fills the same aspect-video, black-backed card so image
 * and youtube candidates line up visually within a round.
 */
export function ImageCard({ src, alt, className }: ImageCardProps) {
  return (
    <div
      data-testid="image-card"
      className={cn(
        "relative aspect-video overflow-hidden bg-black",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- user media served from an external CDN base (NEXT_PUBLIC_MEDIA_BASE_URL); not worth an images.remotePatterns entry per pack image */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <Badge className="absolute left-2 top-2">Image</Badge>
    </div>
  );
}
