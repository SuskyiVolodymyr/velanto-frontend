"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { SignInGate } from "@/components/SignInGate";
import { Text } from "@/ui/Text";
import { Button } from "@/ui/Button";
import { cn } from "@/utils/cn";
import { useAuth } from "@/contexts/auth-context";
import { isStaff } from "@/utils/user-role";
import {
  PAT_SCOPES,
  type PatScope,
  type CreatedApiToken,
} from "@/api/tokens-client";
import { TOKEN_PANEL_CLASS } from "@/features/docs/docs-primitives";
import { SCOPE_KEY } from "../scope-keys";
import { useCreateToken } from "@/features/docs/api/tokens.queries";

/**
 * Order the scope checkboxes are shown in — safest/most common first
 * (`profile:read`), most powerful last (`moderation`, staff-only). This is a UI
 * concern only and is deliberately separate from PAT_SCOPES (the wire taxonomy,
 * whose order the stored scopes preserve). Any scope not listed here still
 * renders, appended after these — so a newly-added scope can never silently
 * vanish from the form.
 */
const SCOPE_DISPLAY_ORDER: PatScope[] = [
  "profile:read",
  "packs:read",
  "packs:write",
  "packs:delete",
  "moderation",
];

/** Field caption above an input / group. */
const FIELD_LABEL_CLASS = "text-xs font-[650] text-foreground-secondary";

/** Expiry presets offered in the create form; "never" maps to null days. */
const EXPIRY_CHOICES = ["30", "90", "365", "never"] as const;
type ExpiryChoice = (typeof EXPIRY_CHOICES)[number];
const DEFAULT_EXPIRY: ExpiryChoice = "90";

function expiryToDays(choice: ExpiryChoice): number | null {
  return choice === "never" ? null : Number(choice);
}

export interface CreateTokenPanelProps {
  /** A KNOWN signed-out viewer — the form stays visible, the button carries the reason. */
  blocked: boolean;
  onCreated: (token: CreatedApiToken) => void;
}

/**
 * Mint form: name, scopes, expiry. The `moderation` scope is offered only to
 * staff, since a non-staff token could never exercise it.
 */
export function CreateTokenPanel({
  blocked,
  onCreated,
}: CreateTokenPanelProps) {
  const t = useTranslations("docs");
  const tAuth = useTranslations("authGate");
  const { status, user } = useAuth();
  const authed = status === "authenticated";
  const createMutation = useCreateToken();

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Set<PatScope>>(new Set());
  const [expiry, setExpiry] = useState<ExpiryChoice>(DEFAULT_EXPIRY);
  const [createError, setCreateError] = useState(false);

  const availableScopes = useMemo(
    () =>
      PAT_SCOPES.filter(
        (scope) => scope !== "moderation" || isStaff(user?.role),
      ),
    [user?.role],
  );

  // Same set as availableScopes, ordered for the checkbox list (see
  // SCOPE_DISPLAY_ORDER). Any scope missing from that order is appended, so it
  // never disappears from the form.
  const displayScopes = useMemo(() => {
    const ordered = SCOPE_DISPLAY_ORDER.filter((scope) =>
      availableScopes.includes(scope),
    );
    const rest = availableScopes.filter(
      (scope) => !SCOPE_DISPLAY_ORDER.includes(scope),
    );
    return [...ordered, ...rest];
  }, [availableScopes]);

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
      onCreated(token);
      setName("");
      setScopes(new Set());
      setExpiry(DEFAULT_EXPIRY);
    } catch {
      setCreateError(true);
    }
  };

  // Signed out: dimmed and non-functional with the reason on hover/focus — not
  // the real `disabled` attribute, which would suppress the Tooltip.
  const createButton = (
    <Button
      onClick={handleCreate}
      loading={createMutation.isPending}
      aria-disabled={blocked || undefined}
      disabled={blocked ? undefined : !canSubmit}
      className={cn("self-start")}
    >
      {t("tokenCreateButton")}
    </Button>
  );

  return (
    <div className={TOKEN_PANEL_CLASS}>
      <h2 className="text-sm font-bold text-foreground">
        {t("tokensHeading")}
      </h2>

      <label className="flex flex-col gap-[7px]">
        <span className={FIELD_LABEL_CLASS}>{t("tokenNameLabel")}</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("tokenNamePlaceholder")}
          maxLength={100}
          disabled={createMutation.isPending}
          className="h-11 rounded-[11px] border border-white/10 bg-background px-[13px] text-sm text-foreground outline-none transition-colors placeholder:text-foreground-tertiary focus:border-acc disabled:opacity-60"
        />
      </label>

      {/* A real <fieldset>/<legend> can't be used here: the browser takes
          <legend> out of the flex flow and paints it over the box's top
          border, so the label collided with the first row. A labelled group
          gives the same semantics with normal layout. */}
      <div
        role="group"
        aria-labelledby="token-scopes-label"
        className="flex flex-col gap-[9px]"
      >
        <span id="token-scopes-label" className={FIELD_LABEL_CLASS}>
          {t("tokenScopesLabel")}
        </span>
        {/* Each scope's own description lives on its row — the mock has no
            separate scope reference above, so the checkbox IS the docs. */}
        {displayScopes.map((scope) => {
          const on = scopes.has(scope);
          return (
            <button
              key={scope}
              type="button"
              role="checkbox"
              // The raw scope id is no longer printed on the row (the mock
              // shows a human label + description), so it's exposed here for
              // the ordering test rather than adding UI nothing reads.
              data-scope={scope}
              aria-checked={on}
              onClick={() => toggleScope(scope)}
              disabled={createMutation.isPending}
              className={cn(
                "flex w-full items-start gap-[11px] rounded-[11px] border p-[11px_12px] text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                on
                  ? "border-acc/30 bg-acc/[0.05]"
                  : "border-white/[0.07] bg-background hover:border-white/20",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-px grid h-[19px] w-[19px] flex-none place-items-center rounded-md border-[1.5px]",
                  on
                    ? "border-acc bg-acc text-[#07131A]"
                    : "border-white/20 bg-transparent",
                )}
              >
                {on && <Check size={12} strokeWidth={3.2} />}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13.5px] font-[650] text-foreground">
                  {t(`scopeLabel_${SCOPE_KEY[scope]}`)}
                </span>
                <span className="text-xs leading-[1.5] text-pretty text-foreground-tertiary">
                  {t(`scopeDesc_${SCOPE_KEY[scope]}`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-[7px]">
        <span className={FIELD_LABEL_CLASS}>{t("tokenExpiryLabel")}</span>
        {/* Mock uses a chip row, not a <select> — four choices read faster
            laid out than collapsed behind a dropdown. */}
        <div role="radiogroup" className="flex flex-wrap gap-[7px]">
          {EXPIRY_CHOICES.map((choice) => {
            const on = expiry === choice;
            return (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setExpiry(choice)}
                disabled={createMutation.isPending}
                className={cn(
                  "h-9 rounded-[10px] border px-[13px] text-[12.5px] font-[650] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                  on
                    ? "border-acc/40 bg-acc/[0.12] text-acc"
                    : "border-white/[0.12] text-foreground-secondary hover:text-foreground",
                )}
              >
                {t(`tokenExpiry_${choice}`)}
              </button>
            );
          })}
        </div>
      </div>

      {blocked ? (
        <SignInGate message={tAuth("logInToCreateTokens")}>
          {createButton}
        </SignInGate>
      ) : (
        createButton
      )}
      {createError && (
        <Text variant="danger" role="alert" className="text-sm">
          {t("tokenCreateError")}
        </Text>
      )}
    </div>
  );
}
