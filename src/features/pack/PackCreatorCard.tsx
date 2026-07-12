"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Hidden } from "@/src/shared/components/Hidden";
import { Username } from "@/src/shared/components/Username";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { AuthorHoverTrigger } from "./AuthorHoverTrigger";
import type { Pack } from "@/src/shared/types/pack";

// Deterministic date formatting (fixed locale) so the server and the client
// fallback render identical markup and don't trip a hydration mismatch.
function formatPublished(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Creator strip on the pack page: the author's @handle + published date,
 * linking to their profile. Hovering (or focusing) the strip reveals a
 * mini-profile with counts, bio, and a follow toggle (see
 * {@link AuthorHoverTrigger}). Until the author resolves — or if it fails — the
 * strip degrades to a plain "view author" link; in streamer mode the hover card
 * is suppressed and the handle redacted, leaving just the link.
 */
export function PackCreatorCard({ pack }: { pack: Pack }) {
  const t = useTranslations("pack");
  const published = formatPublished(pack.createdAt);

  return (
    <AuthorHoverTrigger authorId={pack.authorId}>
      {({ summary, triggerProps }) => (
        <Link
          href={`/users/${pack.authorId}`}
          {...triggerProps}
          className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-white/[0.02] px-[22px] py-5 transition-colors hover:border-border-strong"
        >
          <div className="flex items-center gap-3.5">
            {summary ? (
              <Hidden kind="avatar" id={pack.authorId} className="flex-none">
                <UserAvatar
                  username={summary.profile.username}
                  className="h-11 w-11 rounded-[12px] border border-border bg-surface text-base text-foreground-secondary"
                />
              </Hidden>
            ) : (
              <span
                aria-hidden
                className="h-11 w-11 flex-none rounded-[12px] border border-white/[0.12]"
                style={{
                  background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
                }}
              />
            )}
            <div>
              <Text className="text-[15px] font-semibold">
                {summary ? (
                  <Hidden kind="name" id={pack.authorId}>
                    <Username
                      username={summary.profile.username}
                      role={summary.profile.role}
                      trusted={summary.profile.trusted}
                      at
                    />
                  </Hidden>
                ) : (
                  t("viewAuthor")
                )}
              </Text>
              {published && (
                <Text variant="tertiary" className="mt-0.5 text-xs">
                  {t("published", { date: published })}
                </Text>
              )}
            </div>
          </div>
          <span className="rounded-[10px] border border-border bg-white/[0.05] px-[17px] py-2.5 text-sm font-medium text-foreground">
            {t("viewProfile")}
          </span>
        </Link>
      )}
    </AuthorHoverTrigger>
  );
}
