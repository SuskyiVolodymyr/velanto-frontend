"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import type { CreatePackValues } from "@/features/create/create-pack.schema";

export interface CreatePackBarProps {
  isEdit: boolean;
  /** Where the back tile goes — the pack being edited, or the listing a fresh draft was started from. */
  cancelHref: string;
  /** The live pack title, already falling back to the "new pack" placeholder. */
  title: string;
  /** Create mode's pre-validation display gate. Never a native `disabled` — see the submit button. */
  blocked: boolean;
  coverUploading: boolean;
  justSaved: boolean;
  onSaveDraft: () => void;
}

/**
 * Sticky action bar: icon back-button + live title/draft-status on the start
 * side, Save draft + the single submit button on the end side — at every
 * breakpoint (D2 in the previous design: two same-named Publish controls would
 * break e2e strict-mode `getByRole` lookups; consolidating to ONE control here,
 * always visible, is what keeps that guarantee now that the aside panel no
 * longer has its own CTA — see CreateChecklistPanel).
 *
 * Background/border are edge-to-edge like PackDetailScreen's own sticky bar,
 * but the CONTENT row is not run through the page container — the mock's own
 * header (`padding:13px 30px`, no width cap) spans the full bar, not just the
 * 1320px page column.
 *
 * Renders inside the form's `FormProvider`, so submit/dirty state comes from
 * context rather than from another seven props.
 */
export function CreatePackBar({
  isEdit,
  cancelHref,
  title,
  blocked,
  coverUploading,
  justSaved,
  onSaveDraft,
}: CreatePackBarProps) {
  const t = useTranslations("create");
  const {
    formState: { isSubmitting, isDirty },
  } = useFormContext<CreatePackValues>();

  // Which button initiated the in-flight submit, so only that one shows its
  // spinner/label (both actions run the same validation + mutation).
  const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish");
  const savingDraft = isSubmitting && submitMode === "draft";
  const publishing = isSubmitting && submitMode === "publish";

  // `isDirty` is relative to the form's ORIGINAL defaultValues, not "since the
  // last save" (react-hook-form doesn't move that baseline without an explicit
  // `reset`) — so after a draft save this reverts to "unsaved changes" rather
  // than clearing, which undersells a real save. `justSaved` is given priority
  // for the window where that matters; see JUST_SAVED_MS.
  const draftNote = justSaved
    ? t("bar.draftNoteSaved")
    : isDirty
      ? t("bar.draftNoteUnsaved")
      : undefined;

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="flex items-center gap-3 px-7 py-3 max-[720px]:px-4">
        {/* Boxed back button matching PlayChrome's / the pack surfaces' own
          sticky-bar precedent (38x38, bordered tile) — this was bare (no
          border, no background) before. */}
        <Link
          href={cancelHref}
          aria-label={t("cancel")}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-tile border border-border bg-white/[0.03] text-foreground-secondary transition-colors hover:border-white/[0.18] hover:text-foreground"
        >
          <ArrowLeft size={18} aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-col">
          <Text
            as="span"
            className="truncate text-[14px] font-semibold leading-tight"
          >
            {title}
          </Text>
          {draftNote && (
            <Text
              variant="tertiary"
              role="status"
              className="truncate text-[11.5px] leading-tight"
            >
              {draftNote}
            </Text>
          )}
        </div>
        <div className="ms-auto flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={savingDraft}
            disabled={coverUploading || isSubmitting}
            onClick={() => {
              setSubmitMode("draft");
              onSaveDraft();
            }}
            // Mock: this button's own color communicates draft state (amber =
            // unsaved changes, green = just saved), not just its label — a plain
            // gray secondary button said the same thing twice as quietly as it
            // should. `!` (Tailwind's importance modifier) is required, not
            // decorative: `cn()` is a plain join, not tailwind-merge, so this
            // className is appended after (not instead of) variant="secondary"'s
            // own `bg-white/[0.09] text-foreground` — without `!`, those win the
            // cascade regardless of source order (see Text.tsx's identical
            // documented gotcha; confirmed here the same way, via
            // getComputedStyle before adding `!`).
            className={
              justSaved
                ? "!border !border-[#39d98a]/45 !bg-[#39d98a]/[0.16] !text-[#7ee7b4] hover:!bg-[#39d98a]/[0.16]"
                : "!border !border-[#ffc24b]/35 !bg-[#ffc24b]/10 !text-[#ffd27a] hover:!bg-[#ffc24b]/10"
            }
          >
            {!savingDraft && (
              <svg
                aria-hidden
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 4h11l3 3v13H5z" />
                <path d="M8 4v5h7M8 19v-6h8v6" />
              </svg>
            )}
            {savingDraft
              ? t("savingDraft")
              : justSaved
                ? t("bar.saved")
                : t("saveDraft")}
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={publishing}
            disabled={coverUploading || isSubmitting}
            onClick={() => setSubmitMode("publish")}
            // The blocked-state copy stays a title/tooltip rather than replacing
            // the button's label — swapping label text on disable would break
            // the stable accessible-name e2e selectors below.
            title={blocked ? t("bar.blockedTooltip") : undefined}
            // Display-only gate (never native `disabled`): a blocked click still
            // submits and surfaces the real per-field zod errors instead of
            // dead-ending, matching the JoinRoomCard anon-gate precedent this
            // mirrors from the old preview CTA.
            aria-disabled={blocked ? "true" : undefined}
            // Pins the accessible name to the FULL label regardless of which of
            // the two spans below CSS currently shows — see the comment on them.
            aria-label={!isEdit && !publishing ? t("bar.submit") : undefined}
            // Visual echo of aria-disabled — the button stays natively enabled
            // (see above), so this is cosmetic only.
            className={blocked ? "opacity-70" : undefined}
          >
            {isEdit ? (
              isSubmitting ? (
                t("saving")
              ) : (
                t("saveChanges")
              )
            ) : publishing ? (
              t("bar.submitting")
            ) : (
              // Two spans swapped by a CSS breakpoint rather than JS, so there's
              // no layout-shift flash on resize. The button's accessible name is
              // pinned to the full label via `aria-label` above regardless of
              // which span is visible — a screen reader announcing a different
              // name depending on viewport width would be its own bug, and it
              // keeps every `getByRole("button", { name: "Submit for review" })`
              // selector stable across breakpoints.
              <>
                <span className="max-[720px]:hidden" aria-hidden>
                  {t("bar.submit")}
                </span>
                <span className="hidden max-[720px]:inline" aria-hidden>
                  {t("bar.submitShort")}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
