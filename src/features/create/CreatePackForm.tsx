"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { CreatePackInput } from "@/src/shared/lib/packs-client";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { COVER_TONES } from "@/src/shared/types/pack";
import {
  DEFAULT_PACK_LANGUAGE,
  isPackLanguage,
  type PackLanguage,
} from "@/src/shared/types/pack-language";
import { PACK_CONTAINER } from "@/src/shared/lib/pack-container";
import { cn } from "@/src/shared/lib/cn";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { PackMetaFields } from "@/src/features/create/PackMetaFields";
import { FormatSection } from "@/src/features/create/FormatSection";
import { PoolsSection } from "@/src/features/create/PoolsSection";
import { RoundsEditor } from "@/src/features/create/RoundsEditor";
import { VersusEditor } from "@/src/features/create/VersusEditor";
import { CreateChecklistPanel } from "@/src/features/create/CreateChecklistPanel";
import { summarizePack } from "@/src/features/create/create-pack.summary";
import {
  newGroup,
  newRound,
  versusRounds,
} from "@/src/features/create/create-pack.defaults";
import {
  createPackSchema,
  type CreatePackValues,
} from "@/src/features/create/create-pack.schema";

// How long the sticky bar's draft-status subtitle shows "Draft · saved just
// now" before reverting. A save-draft click still navigates away immediately
// on success (see the onValid draft branch below) — real e2e/vitest coverage
// asserts on that immediate `router.push`, and this repo already treats
// stable navigation timing as load-bearing (see the accessible-name note on
// the submit button below). This flash is therefore mostly cosmetic: it's
// genuinely visible only in the moment before Next.js swaps the route, but
// it's cheap to keep correct for whenever that transition takes longer than
// an instant (slow network, cached-render delay, etc).
const JUST_SAVED_MS = 2200;

// A fresh versus draft defaults to this many rounds; the author tunes it in the
// VersusEditor. Per-side count starts at 1 for both nxn and 1v1.
// A fresh versus pack starts with ONE matchup; the per-round VersusEditor adds
// more (like RoundsEditor). Starting at 1 also keeps a single-item-pool draft
// feasible until the author shapes it.
const DEFAULT_VERSUS_ROUNDS = 1;

function isVersusFormat(format: CreatePackValues["format"]): boolean {
  return format === "nxn" || format === "1v1";
}

type RoundFamily = "versus" | "elimination";

// Which body a format uses. The two families have incompatible round shapes
// (2-slot versus, 1-slot elimination with a count/pins), so switching between
// them reshapes `rounds`.
function familyOf(format: CreatePackValues["format"]): RoundFamily {
  if (isVersusFormat(format)) return "versus";
  return "elimination";
}

// The family the current rounds are already shaped for — read back so a switch
// WITHIN a family (e.g. save_one → rank_blind) leaves the author's rounds alone.
function roundsFamily(rounds: CreatePackValues["rounds"]): RoundFamily {
  if (rounds[0]?.slots.length === 2) return "versus";
  return "elimination";
}

// Editing reuses this whole form: `initialValues` seeds it from an existing
// pack and `packId` switches the submit to a PATCH. Omit both for the create
// flow (the default).
export interface CreatePackFormProps {
  mode?: "create" | "edit";
  packId?: string;
  initialValues?: CreatePackValues;
}

export function CreatePackForm({
  mode = "create",
  packId,
  initialValues,
}: CreatePackFormProps = {}) {
  const t = useTranslations("create");
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();
  const isEdit = mode === "edit";
  // The author's interface language, used as the initial guess for the pack's
  // CONTENT language. Narrowed rather than cast: LOCALES ⊆ PACK_LANGUAGES holds
  // (asserted in cross-repo-drift.test.ts), so this is always true — the guard
  // is here so a future locale added without its PACK_LANGUAGES counterpart
  // degrades to English instead of sending a value the API rejects.
  const locale = useLocale();
  const defaultLanguage: PackLanguage = isPackLanguage(locale)
    ? locale
    : DEFAULT_PACK_LANGUAGE;
  // True while a cover image is uploading; blocks submit so a pending cover
  // isn't silently dropped (see CoverImageField).
  const [coverUploading, setCoverUploading] = useState(false);
  // Which button initiated the in-flight submit, so only that one shows its
  // spinner/label (both actions run the same validation + mutation).
  const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish");
  // True for JUST_SAVED_MS after a successful draft save — drives the sticky
  // bar's "Draft · saved just now" subtitle (see the constant's comment for
  // why this rarely outlives the redirect it's racing). The auto-revert timer
  // is a declarative effect (not a ref) on purpose: `onValid` below is reached
  // from a `handleSubmit(...)` call made during render (the form's own
  // onSubmit), and react-hooks/refs flags a ref read anywhere reachable from
  // there — this way `onValid` only ever calls a state setter.
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), JUST_SAVED_MS);
    return () => clearTimeout(timer);
  }, [justSaved]);

  // Seed one pool plus a matching elimination round drawing from it. Computed
  // once (lazy initializer) so the round's groupId keeps pointing at the pool.
  // In edit mode the seed is the pack's current content instead.
  const [defaultValues] = useState<CreatePackValues>(() => {
    if (initialValues) return initialValues;
    const group = newGroup();
    return {
      title: "",
      description: "",
      coverTone: COVER_TONES[0],
      // Default the CONTENT language to the author's interface language — the
      // best available guess, and the behaviour create-pack.dto.ts already
      // documented but nothing implemented (#239). LOCALES ⊆ PACK_LANGUAGES is
      // what makes this always a legal value.
      language: defaultLanguage,
      tags: [],
      format: "save_one",
      groups: [group],
      rounds: [newRound(group.id)],
    };
  });

  const methods = useForm<CreatePackValues>({
    resolver: zodResolver(createPackSchema),
    defaultValues,
  });
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { isSubmitting, errors, isDirty },
  } = methods;

  // A single whole-form subscription: `format` decides which body (Rounds vs
  // Versus) to render, and the same object feeds the sticky bar's title +
  // blocked-submit tooltip (via summarizePack) now that those live here
  // instead of the old desktop preview CTA. Each section still subscribes to
  // its own slices internally for its own rendering.
  const values = useWatch({ control }) as CreatePackValues;
  const format = values.format;
  const summary = summarizePack(values);
  // The blocked-submit tooltip only applies to create mode's pre-validation
  // display gate (mirrors the old CreatePreviewPanel CTA) — edit mode's
  // "Save changes" always runs the real zod validation on click instead.
  const blocked = !isEdit && !summary.canPublish;
  const barTitle = values.title?.trim() || t("bar.newPackTitle");
  // `isDirty` is relative to the form's ORIGINAL defaultValues, not "since
  // the last save" (react-hook-form doesn't move that baseline without an
  // explicit `reset`) — so after a draft save this reverts to "unsaved
  // changes" rather than clearing, which undersells a real save. `justSaved`
  // is given priority for the window where that matters; see JUST_SAVED_MS.
  const draftNote = justSaved
    ? t("bar.draftNoteSaved")
    : isDirty
      ? t("bar.draftNoteUnsaved")
      : undefined;

  // Reshape `rounds` when the format changes between the elimination family
  // (single-slot rounds) and the versus family (two-slot rounds). Keyed on
  // `format` and reading via getValues so it fires only on an actual switch,
  // never on every keystroke.
  useEffect(() => {
    const groups = getValues("groups");
    const rounds = getValues("rounds");
    const firstId = groups[0]?.id ?? "";
    const target = familyOf(format);
    const current = roundsFamily(rounds);

    if (target === current) {
      // Same family — the only intra-family reshape is nxn → 1v1, which keeps
      // each round's own pair but re-pins every side's count to exactly 1.
      if (
        target === "versus" &&
        format === "1v1" &&
        rounds.some((round) =>
          round.slots.some((slot) => (slot.count ?? 1) !== 1),
        )
      ) {
        setValue(
          "rounds",
          rounds.map((round) => ({
            ...round,
            slots: round.slots.map((slot) => ({ ...slot, count: 1 })),
          })),
          { shouldDirty: true },
        );
      }
      return;
    }

    // Crossing families: reshape to a single default round of the target family
    // (the shapes are incompatible, so there's nothing to carry over).
    if (target === "versus") {
      const aId = groups[0]?.id ?? "";
      const bId = groups[1]?.id ?? groups[0]?.id ?? "";
      setValue("rounds", versusRounds(aId, bId, DEFAULT_VERSUS_ROUNDS, 1), {
        shouldDirty: true,
      });
    } else {
      setValue("rounds", [newRound(firstId)], { shouldDirty: true });
    }
  }, [format, getValues, setValue]);

  async function onValid(formValues: CreatePackValues, draft: boolean) {
    const input: CreatePackInput = {
      title: formValues.title,
      description: formValues.description,
      coverTone: formValues.coverTone,
      coverImageKey: formValues.coverImageKey,
      format: formValues.format,
      language: formValues.language,
      tags: formValues.tags,
      groups: formValues.groups,
      rounds: formValues.rounds,
      draft,
    };

    try {
      let targetId: string;
      if (isEdit && packId) {
        await packsClient.update(packId, input);
        targetId = packId;
      } else {
        const pack = await packsClient.create(input);
        targetId = pack.id;
      }

      // The "Saved" flash is only meaningful for the draft action — Publish
      // navigates straight to the new/reviewed pack regardless. The
      // auto-revert timer is the effect above, keyed on `justSaved`.
      if (draft) setJustSaved(true);
      router.push(`/packs/${targetId}`);
    } catch (err) {
      setError("root", { message: messageFromError(err) });
    }
  }

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{t("loginRequired")}</Text>
        <Button
          className="mt-4"
          onClick={() =>
            router.push(`/auth?next=${encodeURIComponent(pathname)}`)
          }
        >
          {t("logIn")}
        </Button>
      </div>
    );
  }

  // Cancel always names a fixed destination (same rationale as BackButton):
  // back to the pack being edited, or back to the feed for a fresh draft.
  const cancelHref = isEdit && packId ? `/packs/${packId}` : "/";

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit((values) => onValid(values, false))}
        // A browser implicitly submits a form when Enter is pressed in a
        // single-line field, and this form's submit PUBLISHES — or sends a
        // draft to moderation. Typing a title and pressing Enter out of habit
        // was one keystroke from an irreversible-feeling action, with no
        // confirmation. Nothing here wants implicit submission: the pool item
        // adder has its own Enter handler (which still runs — this only stops
        // the default), and Publish / Save draft are explicit buttons.
        //
        // A textarea keeps Enter, where it means a newline. A focused button
        // keeps it, because activating a button IS the deliberate action.
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          const tag = (event.target as HTMLElement).tagName;
          if (tag === "TEXTAREA" || tag === "BUTTON") return;
          event.preventDefault();
        }}
        noValidate
      >
        {/* Sticky action bar: icon back-button + live title/draft-status on
            the start side, Save draft + the single submit button on the end
            side — at every breakpoint (D2 in the previous design: two
            same-named Publish controls would break e2e strict-mode
            `getByRole` lookups; consolidating to ONE control here, always
            visible, is what keeps that guarantee now that the aside panel
            no longer has its own CTA — see CreateChecklistPanel). Mirrors
            PackDetailScreen's sticky bar (`sticky top-0 z-30 border-b
            border-border bg-background/85 backdrop-blur-md`). */}
        <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
          <div
            className={cn(
              PACK_CONTAINER,
              "flex items-center gap-3 py-3 max-[720px]:px-4",
            )}
          >
            <Link
              href={cancelHref}
              aria-label={t("cancel")}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-control text-foreground-secondary transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              <ArrowLeft size={18} aria-hidden />
            </Link>
            <div className="flex min-w-0 flex-col">
              <Text
                as="span"
                className="truncate text-[14px] font-semibold leading-tight"
              >
                {barTitle}
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
                loading={isSubmitting && submitMode === "draft"}
                disabled={coverUploading || isSubmitting}
                onClick={() => {
                  setSubmitMode("draft");
                  void handleSubmit((values) => onValid(values, true))();
                }}
              >
                {isSubmitting && submitMode === "draft"
                  ? t("savingDraft")
                  : justSaved
                    ? t("bar.saved")
                    : t("saveDraft")}
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={isSubmitting && submitMode === "publish"}
                disabled={coverUploading || isSubmitting}
                onClick={() => setSubmitMode("publish")}
                // The blocked-state copy stays a title/tooltip rather than
                // replacing the button's label — swapping label text on
                // disable would break the stable accessible-name e2e
                // selectors below.
                title={blocked ? t("bar.blockedTooltip") : undefined}
                // Display-only gate (never native `disabled`): a blocked
                // click still submits and surfaces the real per-field zod
                // errors instead of dead-ending, matching the JoinRoomCard
                // anon-gate precedent this mirrors from the old preview CTA.
                aria-disabled={blocked ? "true" : undefined}
                // Pins the accessible name to the FULL label regardless of
                // which of the two spans below CSS currently shows — see the
                // comment on them.
                aria-label={
                  !isEdit && !(isSubmitting && submitMode === "publish")
                    ? t("bar.submit")
                    : undefined
                }
                // Visual echo of aria-disabled — the button stays natively
                // enabled (see above), so this is cosmetic only.
                className={blocked ? "opacity-70" : undefined}
              >
                {isEdit ? (
                  isSubmitting ? (
                    t("saving")
                  ) : (
                    t("saveChanges")
                  )
                ) : isSubmitting && submitMode === "publish" ? (
                  t("bar.submitting")
                ) : (
                  // Two spans swapped by a CSS breakpoint rather than JS, so
                  // there's no layout-shift flash on resize. The button's
                  // accessible name is pinned to the full label via
                  // `aria-label` below regardless of which span is visible —
                  // a screen reader announcing a different name depending on
                  // viewport width would be its own bug, and it keeps every
                  // `getByRole("button", { name: "Submit for review" })`
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

        <div className={cn(PACK_CONTAINER, "flex-1 pb-16 pt-8")}>
          {/* Builder column first in the DOM, live-preview aside second — the
              opposite of PackDetailScreen's aside-first precedent. There, the
              aside is the play panel, the primary action for a visitor. Here
              the aside is a supplementary "here's what it'll look like"; an
              author opening this on a phone wants the form first, so DOM
              order already matches the desired mobile stacking order without
              needing an `lg:order-*` override. */}
          <div className="flex flex-wrap items-start gap-[34px]">
            <div className="flex min-w-[300px] flex-1 basis-[540px] flex-col gap-[34px]">
              {errors.root?.message && (
                <Text variant="danger" role="alert" className="text-sm">
                  {errors.root.message}
                </Text>
              )}

              <FormatSection locked={isEdit} />

              <PackMetaFields onCoverUploadingChange={setCoverUploading} />

              <PoolsSection />

              {familyOf(format) === "versus" ? (
                <VersusEditor />
              ) : (
                <RoundsEditor />
              )}
            </div>

            <div className="max-w-[380px] flex-1 basis-[320px]">
              <CreateChecklistPanel values={values} />
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
