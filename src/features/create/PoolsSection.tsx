"use client";

import {
  useFormContext,
  useFieldArray,
  useWatch,
  type FieldErrors,
} from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { getFieldError } from "@/src/shared/components/form/getFieldError";
import { GroupEditor } from "@/src/features/create/GroupEditor";
import { newGroup } from "@/src/features/create/create-pack.defaults";
import { type CreatePackValues } from "@/src/features/create/create-pack.schema";

// A pool's validation error can attach to its name, an index-level issue, or its
// item list. Surface the first in that priority order — matching the
// refinements' short-circuit ordering.
function firstGroupError(
  errors: FieldErrors<CreatePackValues>,
  index: number,
): string | undefined {
  return (
    getFieldError(errors, `groups.${index}.name`) ??
    getFieldError(errors, `groups.${index}`) ??
    getFieldError(errors, `groups.${index}.items`)
  );
}

/**
 * The Pools editor: the reusable item pools that rounds draw from. Always
 * rendered (every format composes rounds over these pools).
 *
 * The groups field array owns add/remove; rendering iterates the `useWatch`ed
 * value array (below) keyed by each entry's stable domain `id` — NOT `fields` —
 * because `fields` updates synchronously on append while `useWatch` lags a
 * render, so `fields[i]` can point at a value that isn't there yet. Per-entry
 * edits go back through `setValue` (which does NOT remount the child the way
 * useFieldArray's `update` does — that would drop focus mid-keystroke).
 */
export function PoolsSection() {
  const t = useTranslations("create");
  const { control, setValue, formState } = useFormContext<CreatePackValues>();
  const { errors } = formState;
  const groupsArray = useFieldArray({
    control,
    name: "groups",
    keyName: "fieldId",
  });
  const groups = useWatch({ control, name: "groups" });
  const groupsError = getFieldError(errors, "groups");

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="title" className="text-lg">
        {t("poolsHeading")}
      </Text>
      {groups.map((group, index) => (
        <GroupEditor
          key={group.id}
          group={group}
          index={index}
          removable={groups.length > 1}
          onChange={(next) =>
            setValue(`groups.${index}`, next, {
              shouldValidate: false,
              shouldDirty: true,
            })
          }
          onRemove={() => groupsArray.remove(index)}
          error={firstGroupError(errors, index)}
        />
      ))}
      {groupsError && (
        <Text variant="danger" role="alert" className="text-sm">
          {groupsError}
        </Text>
      )}
      <Button
        type="button"
        variant="secondary"
        onClick={() => groupsArray.append(newGroup())}
      >
        {t("addPool")}
      </Button>
    </section>
  );
}
