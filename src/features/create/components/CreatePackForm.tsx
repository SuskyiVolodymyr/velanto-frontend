"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/auth-context";
import { useBackTarget } from "@/hooks/use-back-target";
import { FROM } from "@/utils/back-origins";
import { COVER_TONES } from "@/types/pack";
import {
  DEFAULT_PACK_LANGUAGE,
  isPackLanguage,
  type PackLanguage,
} from "@/types/pack-language";
import { pageContainer } from "@/constants/page-container";
import { cn } from "@/utils/cn";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { CreatePackBar } from "@/features/create/components/CreatePackBar";
import { PackMetaFields } from "@/features/create/components/PackMetaFields";
import { FormatSection } from "@/features/create/components/FormatSection";
import { PoolsSection } from "@/features/create/components/PoolsSection";
import { PendingImageDraftsProvider } from "@/features/create/pending-image-drafts";
import { RoundsEditor } from "@/features/create/components/RoundsEditor";
import { VersusEditor } from "@/features/create/components/VersusEditor";
import { CreateChecklistPanel } from "@/features/create/components/CreateChecklistPanel";
import { CreateFeasibilityPanel } from "@/features/create/components/CreateFeasibilityPanel";
import { summarizePack } from "@/features/create/create-pack.summary";
import { newGroup, newRound } from "@/features/create/create-pack.defaults";
import {
  createPackSchema,
  type CreatePackValues,
} from "@/features/create/create-pack.schema";
import {
  familyOf,
  useRoundFamilySync,
} from "@/features/create/hooks/use-round-family-sync";
import { usePendingImagePools } from "@/features/create/hooks/use-pending-image-pools";
import { useRootErrorFocus } from "@/features/create/hooks/use-root-error-focus";
import { useSavePack } from "@/features/create/hooks/use-save-pack";

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
  // Declared up here, above the early returns further down: a hook after a
  // conditional return runs conditionally. A fresh draft is reachable from the
  // dashboard and from My packs, and Cancel goes back to whichever it was.
  const draftCancel = useBackTarget({ href: "/", label: t("cancel") }, [
    FROM.dashboard,
    FROM.myPacks,
  ]);
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
  const { pools: pendingImagePools, drafts: pendingImageDrafts } =
    usePendingImagePools();
  // Destructured, not held as `rootError.ref`: react-hooks/refs rejects a ref
  // reached through a property access during render.
  const { ref: rootErrorRef, reveal: revealRootError } = useRootErrorFocus();

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
    formState: { errors },
  } = methods;

  const { save, justSaved } = useSavePack({
    isEdit,
    packId,
    setError,
    pendingImagePools,
    revealRootError,
  });

  // A single whole-form subscription: `format` decides which body (Rounds vs
  // Versus) to render, and the same object feeds the sticky bar's title +
  // blocked-submit tooltip (via summarizePack) now that those live here instead
  // of the old desktop preview CTA. Each section still subscribes to its own
  // slices internally for its own rendering.
  const values = useWatch({ control }) as CreatePackValues;
  const format = values.format;
  const summary = summarizePack(values);
  // The blocked-submit tooltip only applies to create mode's pre-validation
  // display gate (mirrors the old CreatePreviewPanel CTA) — edit mode's
  // "Save changes" always runs the real zod validation on click instead.
  const blocked = !isEdit && !summary.canPublish;

  useRoundFamilySync(format, getValues, setValue);

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

  // Cancel names a fixed destination (same rationale as BackButton): back to
  // the pack being edited, or — for a fresh draft — back to the listing it was
  // started from, defaulting to the feed.
  const cancelHref = isEdit && packId ? `/packs/${packId}` : draftCancel.href;

  return (
    <FormProvider {...methods}>
      <PendingImageDraftsProvider value={pendingImageDrafts}>
        <form
          onSubmit={handleSubmit((formValues) => save(formValues, false))}
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
          <CreatePackBar
            isEdit={isEdit}
            cancelHref={cancelHref}
            title={values.title?.trim() || t("bar.newPackTitle")}
            blocked={blocked}
            coverUploading={coverUploading}
            justSaved={justSaved}
            onSaveDraft={() =>
              void handleSubmit((formValues) => save(formValues, true))()
            }
          />

          <div className={cn(pageContainer(1320), "flex-1 pb-16 pt-8")}>
            {/* Builder column first in the DOM, live-preview aside second — the
              opposite of PackDetailScreen's aside-first precedent. There, the
              aside is the play panel, the primary action for a visitor. Here
              the aside is a supplementary "here's what it'll look like"; an
              author opening this on a phone wants the form first, so DOM
              order already matches the desired mobile stacking order without
              needing an `lg:order-*` override. */}
            {/*
            No `items-start` here (default `items-stretch`): the sticky aside
            column's containing block must span the SAME height as the main
            column for `position: sticky` to have room to stay pinned while
            scrolling through it — `items-start` sizes each flex item to its
            own content height, so the aside wrapper was only as tall as the
            aside itself and the sticky child had nowhere to travel.
          */}
            <div className="flex flex-wrap gap-[34px]">
              {/*
              `basis-0` (not a large aspirational basis like 540px): the main
              column only needs a `min-width` floor — a real flex-basis here
              was fighting the aside's fixed basis for space and silently
              wrapping the whole aside onto its own line (killing both the
              2-column layout AND the sticky positioning that depends on it)
              at any viewport under ~1357px, which is most desktop widths.
            */}
              <div className="flex min-w-[300px] flex-1 basis-0 flex-col gap-[34px]">
                {errors.root?.message && (
                  // The ref/tabIndex sit on a wrapper, not on Text: Text takes
                  // no ref, and its `danger` variant is the only way to get the
                  // error colour (see the note in Text.tsx).
                  <div ref={rootErrorRef} tabIndex={-1}>
                    <Text variant="danger" role="alert" className="text-sm">
                      {errors.root.message}
                    </Text>
                  </div>
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
                {/* One sticky boundary for the whole aside stack, matching the
                  mock's single `position:sticky` on the aside container
                  (gap:14px) rather than one per panel. */}
                <div className="flex flex-col gap-[14px] lg:sticky lg:top-[82px]">
                  <CreateFeasibilityPanel
                    draft={{
                      format: values.format,
                      groups: values.groups,
                      rounds: values.rounds,
                    }}
                  />
                  <CreateChecklistPanel values={values} />
                </div>
              </div>
            </div>
          </div>
        </form>
      </PendingImageDraftsProvider>
    </FormProvider>
  );
}
