"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Text } from "@/ui/Text";
import { Skeleton } from "@/ui/Skeleton";
import type { ApiToken } from "@/api/tokens-client";
import { TOKEN_PANEL_CLASS } from "@/features/docs/docs-primitives";

/** One row in the "Your tokens" list — inset on the page background. */
const TOKEN_ROW_CLASS =
  "flex flex-wrap items-center gap-2.5 rounded-xl border border-white/[0.06] bg-background p-[12px_13px]";

export interface TokenListProps {
  tokens: ApiToken[];
  isLoading: boolean;
  onRevoke: (token: ApiToken) => void;
}

/**
 * The signed-in reader's existing tokens. Rendered only when authed — signed
 * out the list would always be empty and the heading just noise.
 */
export function TokenList({ tokens, isLoading, onRevoke }: TokenListProps) {
  const t = useTranslations("docs");
  const format = useFormatter();

  return (
    <div className={TOKEN_PANEL_CLASS}>
      <h2 className="text-sm font-bold text-foreground">
        {t("tokenListHeading")}
      </h2>
      {isLoading ? (
        <ul className="flex flex-col gap-[11px]" aria-hidden>
          {[0, 1].map((row) => (
            <li key={row} className={TOKEN_ROW_CLASS}>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-8 w-20 shrink-0" />
            </li>
          ))}
        </ul>
      ) : tokens.length === 0 ? (
        <Text variant="secondary" className="text-sm">
          {t("tokenListEmpty")}
        </Text>
      ) : (
        <ul className="flex flex-col gap-[11px]">
          {tokens.map((token) => (
            <li key={token.id} className={TOKEN_ROW_CLASS}>
              <div className="flex min-w-0 flex-col gap-[3px]">
                <span className="truncate text-[13.5px] font-[650] text-foreground">
                  {token.name}
                </span>
                <span className="font-mono text-[11.5px] text-foreground-tertiary">
                  {token.lastUsedAt
                    ? t("tokenLastUsed", {
                        date: format.dateTime(new Date(token.lastUsedAt), {
                          dateStyle: "medium",
                        }),
                      })
                    : t("tokenNeverUsed")}
                  {" · "}
                  {token.expiresAt
                    ? t("tokenExpiresOn", {
                        date: format.dateTime(new Date(token.expiresAt), {
                          dateStyle: "medium",
                        }),
                      })
                    : t("tokenNeverExpires")}
                </span>
              </div>
              <div className="ms-auto flex flex-wrap gap-1.5">
                {token.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="rounded-md bg-acc/10 px-2 py-0.5 font-mono text-[10px] font-[650] text-[#7FEBFF]"
                  >
                    {scope}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onRevoke(token)}
                className="h-8 flex-none rounded-[9px] bg-danger/10 px-3 text-[12.5px] font-semibold text-[#FF8C8C] transition-colors hover:bg-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
              >
                {t("tokenRevokeButton")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
