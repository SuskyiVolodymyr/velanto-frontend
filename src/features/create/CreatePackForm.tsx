"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { packsClient } from "@/src/shared/lib/packs-client";
import { ApiError } from "@/src/shared/lib/api-client";
import { PACK_TAGS, COVER_TONES } from "@/src/shared/types/pack";
import type { PackFormat, PackTag, Group } from "@/src/shared/types/pack";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { GroupEditor } from "@/src/features/create/GroupEditor";

const MAX_TAGS = 10;
const TITLE_MAX = 100;
const DESCRIPTION_MAX = 500;

function newGroup(): Group {
  return { id: crypto.randomUUID(), name: "", selectionMode: "manual", items: [] };
}

interface FormFields {
  title: string;
  description: string;
  tags: PackTag[];
  groups: Group[];
}

function validate(fields: FormFields): string | null {
  if (!fields.title.trim()) return "Give your pack a title.";
  if (fields.title.length > TITLE_MAX) return `Title must be ${TITLE_MAX} characters or fewer.`;
  if (!fields.description.trim()) return "Add a short description.";
  if (fields.description.length > DESCRIPTION_MAX) {
    return `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }
  if (fields.tags.length > MAX_TAGS) return `Choose at most ${MAX_TAGS} tags.`;
  if (fields.groups.length === 0) return "Add at least one group.";
  for (const group of fields.groups) {
    if (!group.name.trim()) return "Every group needs a name.";
    if (group.items.length === 0) return `Group "${group.name}" needs at least one item.`;
    if (group.selectionMode === "random") {
      if (!group.sampleSize || group.sampleSize < 1) {
        return `Group "${group.name}" needs a sample size.`;
      }
      if (group.sampleSize > group.items.length) {
        return `Group "${group.name}"'s sample size can't exceed its ${group.items.length} item(s).`;
      }
    }
  }
  return null;
}

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as { message?: string | string[] } | null;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message[0] : body.message;
    }
  }
  return "Something went wrong. Please try again.";
}

export function CreatePackForm() {
  const router = useRouter();
  const { status } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverTone, setCoverTone] = useState<string>(COVER_TONES[0]);
  const [tags, setTags] = useState<PackTag[]>([]);
  const [format, setFormat] = useState<PackFormat>("save_one");
  const [groups, setGroups] = useState<Group[]>([newGroup()]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function toggleTag(tag: PackTag) {
    setTags((prev) => {
      const has = prev.includes(tag);
      if (!has && prev.length >= MAX_TAGS) return prev;
      return has ? prev.filter((t) => t !== tag) : [...prev, tag];
    });
  }

  function updateGroup(id: string, next: Group) {
    setGroups((prev) => prev.map((g) => (g.id === id ? next : g)));
  }

  function removeGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;

    const validationError = validate({ title, description, tags, groups });
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setPending(true);
    try {
      const pack = await packsClient.create({
        title: title.trim(),
        description: description.trim(),
        coverTone,
        format,
        tags,
        groups,
      });
      router.push(`/packs/${pack.id}`);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Text variant="secondary">You need to be logged in to create a pack.</Text>
        <Button className="mt-4" onClick={() => router.push("/auth")}>
          Log in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <Text as="h2" variant="title" className="text-lg">
          Basics
        </Text>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Pack title"
          aria-label="Pack title"
          disabled={pending}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description"
          aria-label="Pack description"
          disabled={pending}
          rows={2}
          className="w-full resize-none rounded-[10px] border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45"
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
                onClick={() => setCoverTone(tone)}
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
          <div className="flex items-center justify-between">
            <Text variant="secondary" className="text-xs">
              Tags
            </Text>
            <Text variant="tertiary" className="text-xs">
              {tags.length}/{MAX_TAGS}
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            {PACK_TAGS.map((tag) => {
              const selected = tags.includes(tag);
              const atCap = !selected && tags.length >= MAX_TAGS;
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={atCap}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-[9px] border px-3 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? "border-acc/30 bg-acc/10 text-acc"
                      : "border-border bg-white/[0.03] text-foreground-secondary",
                    atCap && "opacity-40",
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Text as="h2" variant="title" className="text-lg">
          Format
        </Text>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormat("save_one")}
            aria-pressed={format === "save_one"}
            className={cn(
              "flex-1 rounded-[12px] border px-4 py-3 text-left transition-colors",
              format === "save_one" ? "border-acc/40 bg-acc/5" : "border-border bg-white/[0.02]",
            )}
          >
            <Text className="font-semibold">Save One</Text>
            <Text variant="secondary" className="mt-1 text-xs">
              Show a group, keep one to advance.
            </Text>
          </button>
          <button
            type="button"
            onClick={() => setFormat("sacrifice_one")}
            aria-pressed={format === "sacrifice_one"}
            className={cn(
              "flex-1 rounded-[12px] border px-4 py-3 text-left transition-colors",
              format === "sacrifice_one" ? "border-acc/40 bg-acc/5" : "border-border bg-white/[0.02]",
            )}
          >
            <Text className="font-semibold">Sacrifice One</Text>
            <Text variant="secondary" className="mt-1 text-xs">
              Remove one at a time; a favorite remains.
            </Text>
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Text as="h2" variant="title" className="text-lg">
          Groups
        </Text>
        {groups.map((group, index) => (
          <GroupEditor
            key={group.id}
            group={group}
            index={index}
            removable={groups.length > 1}
            onChange={(next) => updateGroup(group.id, next)}
            onRemove={() => removeGroup(group.id)}
          />
        ))}
        <Button type="button" variant="secondary" onClick={() => setGroups((prev) => [...prev, newGroup()])}>
          + Add group (one more round)
        </Button>
      </section>

      {error && <Text className="text-sm text-[#ff6b6b]">{error}</Text>}

      <Button type="submit" disabled={pending} className="h-[50px] w-full">
        {pending ? "Publishing…" : "Publish"}
      </Button>
    </form>
  );
}
