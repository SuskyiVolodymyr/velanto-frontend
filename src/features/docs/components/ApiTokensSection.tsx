"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmModal } from "@/ui/ConfirmModal";
import { useAuth } from "@/contexts/auth-context";
import type { ApiToken, CreatedApiToken } from "@/api/tokens-client";
import { CreateTokenPanel } from "@/features/docs/components/CreateTokenPanel";
import { TokenList } from "@/features/docs/components/TokenList";
import { TokenCreatedModal } from "@/features/docs/components/TokenCreatedModal";
import {
  useApiTokens,
  useRevokeToken,
} from "@/features/docs/api/tokens.queries";

/**
 * The token manager embedded in the API docs topic: mint, list, and revoke
 * Personal Access Tokens so an external agent (an MCP client / AI) can call the
 * API on the user's behalf. A minted token's secret is shown exactly once.
 *
 * Lives on the public docs page, so a signed-out reader still sees the form —
 * blocked with a reason on the submit button, never hidden and never a surprise
 * redirect. Only the token list (which needs an account to mean anything) is
 * withheld.
 *
 * This composes the three panels and owns only the revoke confirmation, which
 * spans the list and the modal.
 */
export function ApiTokensSection() {
  const t = useTranslations("docs");
  const { status } = useAuth();
  const authed = status === "authenticated";
  // Only a KNOWN signed-out viewer is "blocked". While the session is still
  // resolving, `authed` is false but we don't yet know why — claiming "log in to
  // create API tokens" then would be a lie to someone who is in fact logged in.
  const blocked = status === "unauthenticated";

  const tokensQuery = useApiTokens({ enabled: authed });
  const revokeMutation = useRevokeToken();

  const [created, setCreated] = useState<CreatedApiToken | null>(null);
  const [toRevoke, setToRevoke] = useState<ApiToken | null>(null);
  const [revokeError, setRevokeError] = useState(false);

  const handleRevoke = async () => {
    if (!toRevoke) return;
    setRevokeError(false);
    try {
      await revokeMutation.mutateAsync(toRevoke.id);
      setToRevoke(null);
    } catch {
      setRevokeError(true);
    }
  };

  return (
    <>
      {/* Mock: "Create a token" and "Your tokens" are two separate 16px-radius
          panels, not one card with a divider. */}
      <CreateTokenPanel blocked={blocked} onCreated={setCreated} />

      {/* Existing tokens — withheld while signed out, where the list would
          always be empty and the heading just noise. */}
      {authed && (
        <TokenList
          tokens={tokensQuery.data ?? []}
          isLoading={tokensQuery.isLoading}
          onRevoke={(token) => {
            setRevokeError(false);
            setToRevoke(token);
          }}
        />
      )}

      <TokenCreatedModal token={created} onClose={() => setCreated(null)} />

      <ConfirmModal
        open={toRevoke !== null}
        onClose={() => {
          if (revokeMutation.isPending) return;
          setToRevoke(null);
        }}
        onConfirm={() => void handleRevoke()}
        title={t("tokenRevokeTitle")}
        message={t("tokenRevokeWarning", { name: toRevoke?.name ?? "" })}
        confirmLabel={t("tokenRevokeConfirm")}
        cancelLabel={t("tokenRevokeCancel")}
        confirming={revokeMutation.isPending}
        error={revokeError ? t("tokenRevokeError") : null}
      />
    </>
  );
}
