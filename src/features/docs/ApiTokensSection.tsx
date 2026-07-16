"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";
import { Input } from "@/src/shared/components/Input";
import { Select } from "@/src/shared/components/Select";
import { Modal } from "@/src/shared/components/Modal";
import { ConfirmModal } from "@/src/shared/components/ConfirmModal";
import { Tooltip } from "@/src/shared/components/Tooltip";
import { useAuth } from "@/src/shared/lib/auth-context";
import { isStaff } from "@/src/shared/lib/user-role";
import {
  PAT_SCOPES,
  type PatScope,
  type ApiToken,
  type CreatedApiToken,
} from "@/src/shared/lib/tokens-client";
import { SCOPE_KEY } from "./scope-keys";
import {
  useApiTokens,
  useCreateToken,
  useRevokeToken,
} from "@/src/features/docs/api/tokens.queries";

/** Expiry presets offered in the create form; "never" maps to null days. */
const EXPIRY_CHOICES = ["30", "90", "365", "never"] as const;
type ExpiryChoice = (typeof EXPIRY_CHOICES)[number];
const DEFAULT_EXPIRY: ExpiryChoice = "90";

function expiryToDays(choice: ExpiryChoice): number | null {
  return choice === "never" ? null : Number(choice);
}

/**
 * The token manager embedded in the API docs topic: mint, list, and revoke
 * Personal Access Tokens so an external agent (an MCP client / AI) can call the
 * API on the user's behalf. A minted token's secret is shown exactly once.
 *
 * Lives on the public docs page, so a signed-out reader still sees the form —
 * blocked with a reason on the submit button, never hidden and never a surprise
 * redirect. Only the token list (which needs an account to mean anything) is
 * withheld. The `moderation` scope is offered only to staff, since a non-staff
 * token could never exercise it.
 */
export function ApiTokensSection() {
  const t = useTranslations("docs");
  const tAuth = useTranslations("authGate");
  const format = useFormatter();
  const { status, user } = useAuth();
  const authed = status === "authenticated";
  // Only a KNOWN signed-out viewer is "blocked". While the session is still
  // resolving, `authed` is false but we don't yet know why — claiming "log in to
  // create API tokens" then would be a lie to someone who is in fact logged in.
  const blocked = status === "unauthenticated";

  const tokensQuery = useApiTokens({ enabled: authed });
  const createMutation = useCreateToken();
  const revokeMutation = useRevokeToken();

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Set<PatScope>>(new Set());
  const [expiry, setExpiry] = useState<ExpiryChoice>(DEFAULT_EXPIRY);
  const [createError, setCreateError] = useState(false);

  const [created, setCreated] = useState<CreatedApiToken | null>(null);
  const [copied, setCopied] = useState(false);

  const [toRevoke, setToRevoke] = useState<ApiToken | null>(null);
  const [revokeError, setRevokeError] = useState(false);

  const availableScopes = useMemo(
    () =>
      PAT_SCOPES.filter(
        (scope) => scope !== "moderation" || isStaff(user?.role),
      ),
    [user?.role],
  );

  const canSubmit = authed && name.trim().length > 0 && scopes.size > 0;

  const toggleScope = (scope: PatScope) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const handleCreate = async () => {
    // Also guards the blocked (signed-out) button, which is only aria-disabled
    // and therefore still clickable.
    if (!canSubmit) return;
    setCreateError(false);
    try {
      const token = await createMutation.mutateAsync({
        name: name.trim(),
        // Preserve the taxonomy order rather than Set insertion order.
        scopes: availableScopes.filter((s) => scopes.has(s)),
        expiresInDays: expiryToDays(expiry),
      });
      setCreated(token);
      setName("");
      setScopes(new Set());
      setExpiry(DEFAULT_EXPIRY);
    } catch {
      setCreateError(true);
    }
  };

  const handleCopy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.plaintext);
      setCopied(true);
    } catch {
      // Clipboard denied (e.g. insecure context) — the token is visible for
      // manual selection, so this is a non-fatal degradation.
    }
  };

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

  const tokens = tokensQuery.data ?? [];

  // Signed out: dimmed and non-functional with the reason on hover/focus — not
  // the real `disabled` attribute, which would suppress the Tooltip.
  const createButton = (
    <Button
      onClick={handleCreate}
      loading={createMutation.isPending}
      aria-disabled={blocked || undefined}
      disabled={blocked ? undefined : !canSubmit}
      className={blocked ? "cursor-not-allowed opacity-45" : undefined}
    >
      {t("tokenCreateButton")}
    </Button>
  );

  const createButtonWithReason = (
    <Tooltip content={tAuth("logInToCreateTokens")}>{createButton}</Tooltip>
  );

  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        {t("tokensHeading")}
      </Text>

      <Card className="flex flex-col gap-6 hover:translate-y-0 hover:shadow-none">
        {/* No blurb here: the surrounding docs topic already introduces what a
            token is and what each scope grants. */}

        {/* Create form */}
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <Text variant="secondary" className="text-sm">
              {t("tokenNameLabel")}
            </Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("tokenNamePlaceholder")}
              maxLength={100}
              disabled={createMutation.isPending}
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <Text as="legend" variant="secondary" className="text-sm">
              {t("tokenScopesLabel")}
            </Text>
            <div className="flex flex-col gap-2">
              {availableScopes.map((scope) => (
                <label key={scope} className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-acc"
                    checked={scopes.has(scope)}
                    onChange={() => toggleScope(scope)}
                    disabled={createMutation.isPending}
                  />
                  {/* Label only — each scope is described in full just above,
                      so repeating it per checkbox is noise. */}
                  <Text className="text-sm font-medium">
                    {t(`scopeLabel_${SCOPE_KEY[scope]}`)}
                  </Text>
                  <code className="text-xs text-foreground-secondary">
                    {scope}
                  </code>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <Text variant="secondary" className="text-sm">
              {t("tokenExpiryLabel")}
            </Text>
            <Select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value as ExpiryChoice)}
              disabled={createMutation.isPending}
              options={EXPIRY_CHOICES.map((choice) => ({
                value: choice,
                label: t(`tokenExpiry_${choice}`),
              }))}
            />
          </label>

          <div>{blocked ? createButtonWithReason : createButton}</div>
          {createError && (
            <Text role="alert" className="text-sm text-danger">
              {t("tokenCreateError")}
            </Text>
          )}
        </div>

        {/* Existing tokens — withheld while signed out, where the list would
            always be empty and the heading just noise. */}
        {authed && <div className="h-px w-full bg-border" />}
        {authed && (
          <div className="flex flex-col gap-3">
            <Text className="font-semibold">{t("tokenListHeading")}</Text>
            {tokensQuery.isLoading ? (
              <Text variant="secondary" className="text-sm">
                {t("loading")}
              </Text>
            ) : tokens.length === 0 ? (
              <Text variant="secondary" className="text-sm">
                {t("tokenListEmpty")}
              </Text>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {tokens.map((token) => (
                  <li
                    key={token.id}
                    className="flex items-start justify-between gap-4 py-3"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <Text className="truncate font-medium">{token.name}</Text>
                      <div className="flex flex-wrap gap-1.5">
                        {token.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] text-secondary"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                      <Text variant="secondary" className="text-xs">
                        {token.lastUsedAt
                          ? t("tokenLastUsed", {
                              date: format.dateTime(
                                new Date(token.lastUsedAt),
                                {
                                  dateStyle: "medium",
                                },
                              ),
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
                      </Text>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setRevokeError(false);
                        setToRevoke(token);
                      }}
                    >
                      {t("tokenRevokeButton")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {/* Once-shown secret */}
      <Modal
        open={created !== null}
        onClose={() => {
          setCreated(null);
          setCopied(false);
        }}
        title={t("tokenCreatedTitle")}
      >
        <Text variant="secondary" className="text-sm leading-relaxed">
          {t("tokenCreatedWarning")}
        </Text>
        <code className="mt-4 block w-full break-all rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm">
          {created?.plaintext}
        </code>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => void handleCopy()}>
            {copied ? t("tokenCopied") : t("tokenCopy")}
          </Button>
          <Button
            onClick={() => {
              setCreated(null);
              setCopied(false);
            }}
          >
            {t("tokenCreatedDone")}
          </Button>
        </div>
      </Modal>

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
    </section>
  );
}
