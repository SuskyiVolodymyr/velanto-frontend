import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import type { UseFormSetError } from "react-hook-form";
import { packsClient } from "@/api/packs-client";
import type { CreatePackInput } from "@/api/packs-client";
import { messageFromError } from "@/utils/messageFromError";
import type { CreatePackValues } from "@/features/create/create-pack.schema";

// How long the sticky bar's draft-status subtitle shows "Draft · saved just
// now" before reverting. A save-draft click still navigates away immediately on
// success — real e2e/vitest coverage asserts on that immediate `router.push`,
// and this repo already treats stable navigation timing as load-bearing (see
// the accessible-name note on CreatePackBar's submit button). This flash is
// therefore mostly cosmetic: it's genuinely visible only in the moment before
// Next.js swaps the route, but it's cheap to keep correct for whenever that
// transition takes longer than an instant (slow network, cached-render delay).
const JUST_SAVED_MS = 2200;

export interface UseSavePackOptions {
  isEdit: boolean;
  packId?: string;
  setError: UseFormSetError<CreatePackValues>;
  /** Pools holding an uploaded-but-uncommitted image — a save is refused while any exist. */
  pendingImagePools: readonly number[];
  /** Scrolls the form-level error into view; see useRootErrorFocus. */
  revealRootError: () => void;
}

/**
 * The submit path shared by Publish and Save draft: refuse-if-unsaved-image,
 * create or update, drop every cache the write invalidates, navigate.
 */
export function useSavePack({
  isEdit,
  packId,
  setError,
  pendingImagePools,
  revealRootError,
}: UseSavePackOptions) {
  const t = useTranslations("create");
  const router = useRouter();
  const queryClient = useQueryClient();

  // True for JUST_SAVED_MS after a successful draft save — drives the sticky
  // bar's "Draft · saved just now" subtitle. The auto-revert timer is a
  // declarative effect (not a ref) on purpose: `save` below is reached from a
  // `handleSubmit(...)` call made during render (the form's own onSubmit), and
  // react-hooks/refs flags a ref read anywhere reachable from there — this way
  // `save` only ever calls a state setter.
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), JUST_SAVED_MS);
    return () => clearTimeout(timer);
  }, [justSaved]);

  async function save(formValues: CreatePackValues, draft: boolean) {
    // A pool's open item panel can hold an uploaded image that isn't in
    // `formValues` at all — items only enter the pack through their own
    // Add/Save. Saving anyway looks like it worked and quietly leaves the
    // picture behind, which is exactly how #437 cost an author an evening's
    // worth of them. Refuse, and say so.
    if (pendingImagePools.length > 0) {
      setError("root", {
        message: t("unsavedItemImage", {
          pool: Math.min(...pendingImagePools) + 1,
        }),
      });
      // The submit buttons live in the sticky bar, so on a 150-item pack this
      // error renders far above where the author is looking — a refusal they
      // can't see is the same silent no-op the fix exists to remove. Put it in
      // front of them and give it focus.
      revealRootError();
      return;
    }

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

      // Every cached view of what just changed, dropped on the one action that
      // makes them all wrong for THIS user. Once, after either branch above.
      //
      // The home feed holds its list for several minutes (packs-feed.queries.ts)
      // so a visitor's hydration doesn't refetch it — a deliberate Neon-compute
      // saving that would otherwise hide the author's own change from them,
      // reading as a bug rather than as staleness. The pack's own fetches are
      // the same story on a 30s timer: reopening the editor right after saving
      // re-served the pre-save pack, and the only way out was reloading the page
      // by hand.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["packs-feed"] }),
        // The authed re-fetch behind EditPackFallback / PackDetailFallback —
        // the one an author's own draft or pending pack always goes through,
        // since the anonymous Server fetch can't see it.
        queryClient.invalidateQueries({
          queryKey: ["pack-fallback", targetId],
        }),
        // Saving re-enters moderation, so the review banner is stale too.
        queryClient.invalidateQueries({
          queryKey: ["pack-review-outcome", targetId],
        }),
        // The author's own listing shows the title and status that just moved.
        queryClient.invalidateQueries({ queryKey: ["my-packs"] }),
      ]);

      // TanStack isn't the only cache in play: /packs/[id] and its /edit child
      // are Server Components, and Next serves their already-rendered RSC
      // payload from the client router cache. Without this the editor reopens
      // on the pre-save render however fresh the query cache is.
      router.refresh();

      // The "Saved" flash is only meaningful for the draft action — Publish
      // navigates straight to the new/reviewed pack regardless. The auto-revert
      // timer is the effect above, keyed on `justSaved`.
      if (draft) setJustSaved(true);
      router.push(`/packs/${targetId}`);
    } catch (err) {
      setError("root", { message: messageFromError(err) });
    }
  }

  return { save, justSaved };
}
