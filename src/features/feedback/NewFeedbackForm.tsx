"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/shared/lib/auth-context";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { ApiError } from "@/src/shared/lib/api-client";
import { LOCALES, LOCALE_NAMES } from "@/src/i18n/config";
import type { CreateFeedbackInput, FeedbackTopic, FeedbackVisibility } from "@/src/shared/types/feedback";
import { TOPIC_LABELS } from "@/src/features/feedback/FeedbackCard";
import { Input } from "@/src/shared/components/Input";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";

const TITLE_MAX = 140;
const BODY_MAX = 4000;

const TOPIC_ORDER: FeedbackTopic[] = ["bug", "feature", "translation", "other"];

const VISIBILITY_OPTIONS: { value: FeedbackVisibility; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "staff_only", label: "Staff-only" },
];

export interface NewFeedbackFields {
  topic: FeedbackTopic;
  title: string;
  body: string;
  visibility: FeedbackVisibility;
  locale: string; // '' when unset
  translationContext: string;
  translationSuggestion: string;
}

export function validate(f: NewFeedbackFields): string | null {
  if (!f.title.trim()) return "Title is required.";
  if (f.title.trim().length > TITLE_MAX) return `Title must be ${TITLE_MAX} characters or fewer.`;
  if (!f.body.trim()) return "Details are required.";
  if (f.body.trim().length > BODY_MAX) return `Details must be ${BODY_MAX} characters or fewer.`;
  if (f.topic === "translation") {
    if (!f.locale) return "Please choose the language for your translation suggestion.";
    if (!f.translationSuggestion.trim()) return "Please enter your suggested wording.";
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

const textareaClass =
  "w-full resize-none rounded-[10px] border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45";

const selectClass =
  "h-11 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-45";

const toggleButtonClass = (active: boolean) =>
  cn(
    "flex-1 rounded-[12px] border px-4 py-3 text-sm font-semibold transition-colors",
    active ? "border-acc/40 bg-acc/5 text-foreground" : "border-border bg-white/[0.02] text-foreground-secondary",
  );

export function NewFeedbackForm() {
  const router = useRouter();
  const { status } = useAuth();

  const [topic, setTopic] = useState<FeedbackTopic>("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<FeedbackVisibility>("everyone");
  const [locale, setLocale] = useState("");
  const [translationContext, setTranslationContext] = useState("");
  const [translationSuggestion, setTranslationSuggestion] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth?next=/feedback/new");
    }
  }, [status, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;

    const fields: NewFeedbackFields = {
      topic,
      title,
      body,
      visibility,
      locale,
      translationContext,
      translationSuggestion,
    };
    const validationError = validate(fields);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");

    const input: CreateFeedbackInput = {
      topic,
      title: title.trim(),
      body: body.trim(),
      visibility,
    };
    if (topic === "translation") {
      input.locale = locale;
      if (translationContext.trim()) input.translationContext = translationContext.trim();
      input.translationSuggestion = translationSuggestion.trim();
    }

    setPending(true);
    try {
      const created = await feedbackClient.create(input);
      router.push(`/feedback/${created.id}`);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="mx-auto w-full max-w-2xl px-7 py-10">
        <Text variant="secondary">Loading…</Text>
      </main>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <main className="mx-auto w-full max-w-2xl px-7 py-10">
      <Text as="h1" variant="title" className="mb-6 text-2xl">
        New feedback
      </Text>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <Text variant="secondary" className="text-xs">
            Topic
          </Text>
          <div className="flex flex-wrap gap-2">
            {TOPIC_ORDER.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTopic(value)}
                aria-pressed={topic === value}
                disabled={pending}
                className={toggleButtonClass(topic === value)}
              >
                {TOPIC_LABELS[value]}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <Text variant="secondary" className="text-xs">
            Title
          </Text>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A short summary"
            aria-label="Title"
            maxLength={TITLE_MAX}
            disabled={pending}
          />
        </section>

        <section className="flex flex-col gap-2">
          <Text variant="secondary" className="text-xs">
            Details
          </Text>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe your bug, idea, or suggestion"
            aria-label="Details"
            rows={5}
            disabled={pending}
            className={textareaClass}
          />
        </section>

        <section className="flex flex-col gap-2">
          <Text variant="secondary" className="text-xs">
            Visibility
          </Text>
          <div className="flex gap-2">
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setVisibility(option.value)}
                aria-pressed={visibility === option.value}
                disabled={pending}
                className={toggleButtonClass(visibility === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Text variant="tertiary" className="text-xs">
            Staff-only posts are visible only to you and the team.
          </Text>
        </section>

        {topic === "translation" && (
          <section className="flex flex-col gap-4 rounded-[15px] border border-border bg-white/[0.02] p-5">
            <Text className="text-sm font-semibold">Translation suggestion</Text>
            <div className="flex flex-col gap-2">
              <Text variant="secondary" className="text-xs">
                Language
              </Text>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                aria-label="Language"
                disabled={pending}
                className={selectClass}
              >
                <option value="">Choose a language…</option>
                {LOCALES.map((code) => (
                  <option key={code} value={code}>
                    {LOCALE_NAMES[code]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Text variant="secondary" className="text-xs">
                Which text / where you saw it (optional)
              </Text>
              <Input
                value={translationContext}
                onChange={(e) => setTranslationContext(e.target.value)}
                placeholder="e.g. the Play button on the home screen"
                aria-label="Which text / where you saw it (optional)"
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Text variant="secondary" className="text-xs">
                Your suggested wording
              </Text>
              <textarea
                value={translationSuggestion}
                onChange={(e) => setTranslationSuggestion(e.target.value)}
                placeholder="What it should say instead"
                aria-label="Your suggested wording"
                rows={3}
                disabled={pending}
                className={textareaClass}
              />
            </div>
          </section>
        )}

        {error && <Text className="text-sm text-[#ff6b6b]">{error}</Text>}

        <Button type="submit" disabled={pending} className="h-[50px] w-full">
          {pending ? "Posting…" : "Post feedback"}
        </Button>
      </form>
    </main>
  );
}
