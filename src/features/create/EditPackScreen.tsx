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
      <Text variant="secondary" className="py-10 text-center">
        {t("editOthersForbidden")}
      </Text>
    );
  }

  // UI-EXCLUDED:save_one_friends (velanto-frontend#368) — null means the pack's
  // format has no creator UI. Say so plainly: seeding the form anyway leaves the
  // format picker with nothing selected and Save silently failing validation
  // against a control the author cannot see.
  const initialValues = packToFormValues(pack);
  if (!initialValues) {
    return (
      <Text variant="secondary" className="py-10 text-center">
        {t("editFormatUnsupported")}
      </Text>
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
