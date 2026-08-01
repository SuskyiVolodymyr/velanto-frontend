"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { CreatePackForm } from "@/src/features/create/CreatePackForm";
import { packToFormValues } from "@/src/features/create/pack-to-form-values";
import { Text } from "@/src/shared/components/Text";
import type { Pack } from "@/src/shared/types/pack";

/**
 * Client boundary for the edit page. Editing is author-only: a signed-in user
 * who isn't the author is blocked here (the backend enforces the same), while a
 * signed-out visitor falls through to CreatePackForm's own login gate. When the
 * viewer is the author, the shared create form is seeded from the pack and put
 * in edit mode.
 */
export function EditPackScreen({ pack }: { pack: Pack }) {
  const t = useTranslations("create");
  const { user, status } = useAuth();

  if (status === "loading") return null;

  if (status === "authenticated" && user && user.id !== pack.authorId) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{t("editOthersForbidden")}</Text>
      </div>
    );
  }

  // null means the pack's format is one this build doesn't know (a backend
  // deployed ahead of the frontend) — every shipped format seeds the form. Say
  // so plainly rather than seeding a form with no matching option and a Save
  // that silently fails validation.
  const initialValues = packToFormValues(pack);
  if (!initialValues) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">{t("editFormatUnsupported")}</Text>
      </div>
    );
  }

  return (
    <CreatePackForm
      mode="edit"
      packId={pack.id}
      initialValues={initialValues}
    />
  );
}
