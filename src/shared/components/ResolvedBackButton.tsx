"use client";

import { BackButton } from "@/src/shared/components/BackButton";
import { FROM } from "@/src/shared/lib/back-origins";
import { useBackTarget } from "@/src/shared/lib/use-back-target";

/**
 * A back pill that returns to the page it was opened from, when that page is
 * one this screen accepts, and to a fixed fallback otherwise.
 *
 * A client island wrapping {@link BackButton}, because the page it sits on is
 * usually a Server Component and the answer depends on sessionStorage. Origins
 * arrive as KEYS of {@link FROM} rather than as patterns: a RegExp cannot cross
 * the server/client boundary as a prop, and naming the origins also keeps the
 * call sites readable — `from={["dashboard", "myPacks", "history"]}` says what
 * it means without a regex in the middle of a page header.
 */
export function ResolvedBackButton({
  fallbackHref,
  fallbackLabel,
  from,
  className,
}: {
  fallbackHref: string;
  fallbackLabel: string;
  from: (keyof typeof FROM)[];
  className?: string;
}) {
  const target = useBackTarget(
    { href: fallbackHref, label: fallbackLabel },
    from.map((key) => FROM[key]),
  );

  return (
    <BackButton href={target.href} label={target.label} className={className} />
  );
}
