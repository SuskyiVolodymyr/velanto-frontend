"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Hidden } from "@/src/shared/components/Hidden";
import { AuthorHoverTrigger } from "./AuthorHoverTrigger";
import type { Pack } from "@/src/shared/types/pack";

/**
 * The author line overlaid on the pack hero banner. Shows the author's @handle
 * (redacted in streamer mode) with the pack's cover-tone swatch and reveals the
 * shared mini-profile hover card, matching the creator strip lower on the page.
 * Until the author resolves it degrades to a plain "view author" link.
 */
export function PackBannerAuthor({ pack }: { pack: Pack }) {
  const t = useTranslations("pack");

  return (
    <AuthorHoverTrigger authorId={pack.authorId} className="w-fit">
      {({ summary, triggerProps }) => (
        <Link
          href={`/users/${pack.authorId}`}
          {...triggerProps}
          className="inline-flex items-center gap-2.5 text-sm text-white/75 transition-colors hover:text-white"
        >
          <span
            aria-hidden
            className="h-5 w-5 flex-none rounded-md border border-white/25"
            style={{ background: pack.coverTone }}
          />
          {summary ? (
            <Hidden kind="name" id={pack.authorId}>
              {`@${summary.profile.username}`}
            </Hidden>
          ) : (
            t("viewAuthor")
          )}
        </Link>
      )}
    </AuthorHoverTrigger>
  );
}
