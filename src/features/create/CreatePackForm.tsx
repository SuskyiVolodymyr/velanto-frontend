"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  useForm,
  useFieldArray,
  useWatch,
  FormProvider,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import type { CreatePackInput } from "@/src/shared/lib/packs-client";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { COVER_TONES } from "@/src/shared/types/pack";
import type { PackFormat, Group, Category } from "@/src/shared/types/pack";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { TagPickerModal } from "@/src/shared/components/TagPickerModal";
import { TextField } from "@/src/shared/components/form/TextField";
import { TextareaField } from "@/src/shared/components/form/TextareaField";
import { getFieldError } from "@/src/shared/components/form/getFieldError";
import { cn } from "@/src/shared/lib/cn";
import { GroupEditor } from "@/src/features/create/GroupEditor";
import { CategoryEditor } from "@/src/features/create/CategoryEditor";
import {
  createPackSchema,
  type CreatePackValues,
  MAX_TAGS,
  MIN_VERSUS_ROUNDS,
  MAX_VERSUS_ROUNDS,
  MIN_VERSUS_N,
  MAX_VERSUS_N,
} from "@/src/features/create/create-pack.schema";

function newGroup(): Group {
  return { id: crypto.randomUUID(), name: "", selectionMode: "manual", items: [] };
}

function newCategory(): Category {
  return { id: crypto.randomUUID(), name: "", items: [] };
}

// A group's validation error can attach to its name, its round-size (an
// index-level issue used by the 1v1 format), its item list, or its sample size.
// Surface the first in that priority order — matching the old validate()'s
// short-circuit ordering.
function firstGroupError(errors: FieldErrors<CreatePackValues>, index: number): string | undefined {
  return (
    getFieldError(errors, `groups.${index}.name`) ??
    getFieldError(errors, `groups.${index}`) ??
    getFieldError(errors, `groups.${index}.items`) ??
    getFieldError(errors, `groups.${index}.sampleSize`)
  );
}

function firstCategoryError(errors: FieldErrors<CreatePackValues>, index: number): string | undefined {
  return (
    getFieldError(errors, `categories.${index}.name`) ??
    getFieldError(errors, `categories.${index}.items`)
  );
}

const FORMAT_OPTIONS: { value: PackFormat; title: string; blurb: string }[] = [
  { value: "save_one", title: "Save One", blurb: "Show a group, keep one to advance." },
  { value: "sacrifice_one", title: "Sacrifice One", blurb: "Remove one at a time; a favorite remains." },
  { value: "nxn", title: "NxN", blurb: "Two categories compared side by side." },
  { value: "rank_blind", title: "Rank Blind", blurb: "Place each pick blind into a growing ranked list." },
  { value: "1v1", title: "1v1", blurb: "Pick a winner in each head-to-head matchup." },
];

export function CreatePackForm() {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();

  const methods = useForm<CreatePackValues>({
    resolver: zodResolver(createPackSchema),
    defaultValues: {
      title: "",
      description: "",
      coverTone: COVER_TONES[0],
      tags: [],
      format: "save_one",
      groups: [newGroup()],
      categories: [newCategory(), newCategory()],
      versusRounds: undefined,
      versusN: undefined,
    },
  });
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { isSubmitting, errors },
  } = methods;

  // Field arrays own the add/remove + stable React keys; live values come from
  // `useWatch` and per-entry edits go back through `setValue` (which does NOT
  // remount the child the way useFieldArray's `update` does — that would drop
  // focus mid-keystroke). `keyName: "fieldId"` keeps our domain `id` intact.
  const groupsArray = useFieldArray({ control, name: "groups", keyName: "fieldId" });
  const categoriesArray = useFieldArray({ control, name: "categories", keyName: "fieldId" });

  // `useWatch` (not `methods.watch`) is the memoization-safe subscription the
  // React Compiler is happy with.
  const format = useWatch({ control, name: "format" });
  const tags = useWatch({ control, name: "tags" });
  const coverTone = useWatch({ control, name: "coverTone" });
  const groups = useWatch({ control, name: "groups" });
  const categories = useWatch({ control, name: "categories" });
  const versusRounds = useWatch({ control, name: "versusRounds" });
  const versusN = useWatch({ control, name: "versusN" });

  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  async function onValid(values: CreatePackValues) {
    const base = {
      title: values.title,
      description: values.description,
      coverTone: values.coverTone,
      format: values.format,
      tags: values.tags,
    };
    const input: CreatePackInput =
      values.format === "nxn"
        ? {
            ...base,
            categories: values.categories,
            versusRounds: values.versusRounds,
            versusN: values.versusN,
          }
        : { ...base, groups: values.groups };

    try {
      const pack = await packsClient.create(input);
      router.push(`/packs/${pack.id}`);
    } catch (err) {
      setError("root", { message: messageFromError(err) });
    }
  }

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">You need to be logged in to create a pack.</Text>
        <Button className="mt-4" onClick={() => router.push(`/auth?next=${encodeURIComponent(pathname)}`)}>
          Log in
        </Button>
      </div>
    );
  }

  const groupsError = getFieldError(errors, "groups");
  const categoriesError = getFieldError(errors, "categories");
  const versusRoundsError = getFieldError(errors, "versusRounds");
  const versusNError = getFieldError(errors, "versusN");

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onValid)} noValidate className="flex max-w-2xl flex-col gap-8">
        <section className="flex flex-col gap-3">
          <Text as="h2" variant="title" className="text-lg">
            Basics
          </Text>
          <TextField
            name="title"
            label="Pack title"
            srOnlyLabel
            placeholder="Pack title"
            disabled={isSubmitting}
          />
          <TextareaField
            name="description"
            label="Pack description"
            srOnlyLabel
            placeholder="Short description"
            rows={2}
            disabled={isSubmitting}
          />
          <div className="flex flex-col gap-2">
            <Text variant="secondary" className="text-xs">
              Cover tone
            </Text>
            <div className="flex gap-2">
              {COVER_TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setValue("coverTone", tone)}
                  aria-label={`Cover tone ${tone}`}
                  aria-pressed={coverTone === tone}
                  style={{ background: tone }}
                  className={cn(
                    "h-9 w-9 rounded-[10px] border-2",
                    coverTone === tone ? "border-acc" : "border-transparent",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Text variant="secondary" className="text-xs">
              Tags
            </Text>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTagPickerOpen(true)}
              className="self-start"
            >
              {tags.length === 0
                ? "Select tags"
                : `${tags.length} tag${tags.length === 1 ? "" : "s"} selected`}
            </Button>
            <TagPickerModal
              open={tagPickerOpen}
              onClose={() => setTagPickerOpen(false)}
              selected={tags}
              onChange={(next) => setValue("tags", next)}
              maxTags={MAX_TAGS}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <Text as="h2" variant="title" className="text-lg">
            Format
          </Text>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue("format", option.value)}
                aria-pressed={format === option.value}
                className={cn(
                  "flex-1 rounded-[12px] border px-4 py-3 text-left transition-colors",
                  format === option.value ? "border-acc/40 bg-acc/5" : "border-border bg-white/[0.02]",
                )}
              >
                <Text className="font-semibold">{option.title}</Text>
                <Text variant="secondary" className="mt-1 text-xs">
                  {option.blurb}
                </Text>
              </button>
            ))}
          </div>
        </section>

        {format === "nxn" ? (
          <section className="flex flex-col gap-3">
            <Text as="h2" variant="title" className="text-lg">
              Categories
            </Text>
            {categoriesArray.fields.map((field, index) => (
              <CategoryEditor
                key={field.fieldId}
                category={categories[index]}
                index={index}
                onChange={(next) =>
                  setValue(`categories.${index}`, next, { shouldValidate: false, shouldDirty: true })
                }
                error={firstCategoryError(errors, index)}
              />
            ))}
            {categoriesError && (
              <Text role="alert" className="text-sm text-[#ff6b6b]">
                {categoriesError}
              </Text>
            )}
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  type="number"
                  min={MIN_VERSUS_ROUNDS}
                  max={MAX_VERSUS_ROUNDS}
                  value={versusRounds ?? ""}
                  onChange={(e) =>
                    setValue("versusRounds", e.target.value === "" ? undefined : Number(e.target.value), {
                      shouldValidate: false,
                    })
                  }
                  placeholder="Rounds"
                  aria-label="Rounds"
                />
                {versusRoundsError && (
                  <Text role="alert" className="text-sm text-[#ff6b6b]">
                    {versusRoundsError}
                  </Text>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  type="number"
                  min={MIN_VERSUS_N}
                  max={MAX_VERSUS_N}
                  value={versusN ?? ""}
                  onChange={(e) =>
                    setValue("versusN", e.target.value === "" ? undefined : Number(e.target.value), {
                      shouldValidate: false,
                    })
                  }
                  placeholder="Items per round"
                  aria-label="Items per round"
                />
                {versusNError && (
                  <Text role="alert" className="text-sm text-[#ff6b6b]">
                    {versusNError}
                  </Text>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-3">
            <Text as="h2" variant="title" className="text-lg">
              Groups
            </Text>
            {groupsArray.fields.map((field, index) => (
              <GroupEditor
                key={field.fieldId}
                group={groups[index]}
                index={index}
                removable={groupsArray.fields.length > 1}
                onChange={(next) =>
                  setValue(`groups.${index}`, next, { shouldValidate: false, shouldDirty: true })
                }
                onRemove={() => groupsArray.remove(index)}
                error={firstGroupError(errors, index)}
              />
            ))}
            {groupsError && (
              <Text role="alert" className="text-sm text-[#ff6b6b]">
                {groupsError}
              </Text>
            )}
            <Button type="button" variant="secondary" onClick={() => groupsArray.append(newGroup())}>
              + Add group (one more round)
            </Button>
          </section>
        )}

        {errors.root?.message && (
          <Text role="alert" className="text-sm text-[#ff6b6b]">
            {errors.root.message}
          </Text>
        )}

        <Button type="submit" disabled={isSubmitting} className="h-[50px] w-full">
          {isSubmitting ? "Publishing…" : "Publish"}
        </Button>
      </form>
    </FormProvider>
  );
}
