"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { PackMetaFields } from "@/src/features/create/PackMetaFields";
import { FormatSection } from "@/src/features/create/FormatSection";
import { PoolsSection } from "@/src/features/create/PoolsSection";
import { RoundsEditor } from "@/src/features/create/RoundsEditor";
import { FriendsRoundsEditor } from "@/src/features/create/FriendsRoundsEditor";
import { VersusEditor } from "@/src/features/create/VersusEditor";
import {
  newGroup,
  newRound,
  newFriendsRound,
  versusRounds,
} from "@/src/features/create/create-pack.defaults";
import {
  createPackSchema,
  type CreatePackValues,
} from "@/src/features/create/create-pack.schema";

// A fresh versus draft defaults to this many rounds; the author tunes it in the
// VersusEditor. Per-side count starts at 1 for both nxn and 1v1.
// A fresh versus pack starts with ONE matchup; the per-round VersusEditor adds
// more (like RoundsEditor). Starting at 1 also keeps a single-item-pool draft
// feasible until the author shapes it.
const DEFAULT_VERSUS_ROUNDS = 1;

function isVersusFormat(format: CreatePackValues["format"]): boolean {
  return format === "nxn" || format === "1v1";
}

type RoundFamily = "versus" | "friends" | "elimination";

// Which body a format uses. The three families have incompatible round shapes
// (2-slot versus, 1-slot friends with no count, 1-slot elimination with a
// count/pins), so switching between them reshapes `rounds`.
function familyOf(format: CreatePackValues["format"]): RoundFamily {
  if (isVersusFormat(format)) return "versus";
  if (format === "save_one_friends") return "friends";
  return "elimination";
}

// The family the current rounds are already shaped for — read back so a switch
// WITHIN a family (e.g. save_one → rank_blind) leaves the author's rounds alone.
function roundsFamily(rounds: CreatePackValues["rounds"]): RoundFamily {
  const slot = rounds[0]?.slots[0];
  if (rounds[0]?.slots.length === 2) return "versus";
  // A friends slot is the only single-slot random draw with no count and no
  // pinned items; an elimination random slot always carries a count.
  if (
    slot &&
    slot.mode === "random" &&
    slot.count === undefined &&
    !slot.itemIds
  )
    return "friends";
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
    formState: { isSubmitting, errors },
  } = methods;

  // The one subscription the orchestrator needs itself: which body (Rounds vs
  // Versus) to render. Each section subscribes to its own slices internally.
  const format = useWatch({ control, name: "format" });

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
    } else if (target === "friends") {
      setValue("rounds", [newFriendsRound(firstId)], { shouldDirty: true });
    } else {
      setValue("rounds", [newRound(firstId)], { shouldDirty: true });
    }
  }, [format, getValues, setValue]);

  async function onValid(values: CreatePackValues, draft: boolean) {
    const input: CreatePackInput = {
      title: values.title,
      description: values.description,
      coverTone: values.coverTone,
      coverImageKey: values.coverImageKey,
      format: values.format,
      language: values.language,
      tags: values.tags,
      groups: values.groups,
      rounds: values.rounds,
      draft,
    };

    try {
      if (isEdit && packId) {
        await packsClient.update(packId, input);
        router.push(`/packs/${packId}`);
      } else {
        const pack = await packsClient.create(input);
        router.push(`/packs/${pack.id}`);
      }
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
        className="flex flex-col gap-8"
      >
        <PackMetaFields onCoverUploadingChange={setCoverUploading} />

        <FormatSection />

        <PoolsSection />

        {familyOf(format) === "versus" ? (
          <VersusEditor />
        ) : familyOf(format) === "friends" ? (
          <FriendsRoundsEditor />
        ) : (
          <RoundsEditor />
        )}

        {errors.root?.message && (
          <Text variant="danger" role="alert" className="text-sm">
            {errors.root.message}
          </Text>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            loading={isSubmitting && submitMode === "draft"}
            disabled={coverUploading || isSubmitting}
            onClick={() => {
              setSubmitMode("draft");
              void handleSubmit((values) => onValid(values, true))();
            }}
            className="h-[50px] sm:flex-1"
          >
            {isSubmitting && submitMode === "draft"
              ? t("savingDraft")
              : t("saveDraft")}
          </Button>
          <Button
            type="submit"
            loading={isSubmitting && submitMode === "publish"}
            disabled={coverUploading || isSubmitting}
            onClick={() => setSubmitMode("publish")}
            className="h-[50px] sm:flex-[2]"
          >
            {isSubmitting && submitMode === "publish"
              ? isEdit
                ? t("saving")
                : t("publishing")
              : isEdit
                ? t("saveChanges")
                : t("publish")}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
