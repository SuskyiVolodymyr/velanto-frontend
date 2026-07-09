"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/src/shared/lib/auth-context";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { LOCALES, LOCALE_NAMES } from "@/src/i18n/config";
import type { CreateFeedbackInput, FeedbackTopic, FeedbackVisibility } from "@/src/shared/types/feedback";
import { TOPIC_LABELS } from "@/src/features/feedback/FeedbackCard";
import {
  newFeedbackSchema,
  type NewFeedbackValues,
  TITLE_MAX,
} from "@/src/features/feedback/new-feedback.schema";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { TextField } from "@/src/shared/components/form/TextField";
import { TextareaField } from "@/src/shared/components/form/TextareaField";
import { SelectField } from "@/src/shared/components/form/SelectField";
import { SegmentedField } from "@/src/shared/components/form/SegmentedField";

const TOPIC_ORDER: FeedbackTopic[] = ["bug", "feature", "translation", "other"];

const TOPIC_OPTIONS = TOPIC_ORDER.map((value) => ({
  value,
  label: TOPIC_LABELS[value],
}));

const VISIBILITY_OPTIONS: { value: FeedbackVisibility; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "staff_only", label: "Staff-only" },
];

const LANGUAGE_OPTIONS = [
  { value: "", label: "Choose a language…" },
  ...LOCALES.map((code) => ({ value: code, label: LOCALE_NAMES[code] })),
];

export function NewFeedbackForm() {
  const router = useRouter();
  const { status } = useAuth();

  const methods = useForm<NewFeedbackValues>({
    resolver: zodResolver(newFeedbackSchema),
    defaultValues: {
      topic: "bug",
      title: "",
      body: "",
      visibility: "everyone",
      locale: "",
      translationContext: "",
      translationSuggestion: "",
    },
  });
  const {
    handleSubmit,
    control,
    setError,
    formState: { isSubmitting, errors },
  } = methods;

  // `useWatch` (not `methods.watch`) is the memoization-safe subscription the
  // React Compiler is happy with.
  const topic = useWatch({ control, name: "topic" });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth?next=/feedback/new");
    }
  }, [status, router]);

  async function onValid(values: NewFeedbackValues) {
    const input: CreateFeedbackInput = {
      topic: values.topic,
      title: values.title,
      body: values.body,
      visibility: values.visibility,
    };
    if (values.topic === "translation") {
      input.locale = values.locale;
      if (values.translationContext.trim()) {
        input.translationContext = values.translationContext.trim();
      }
      input.translationSuggestion = values.translationSuggestion.trim();
    }

    try {
      const created = await feedbackClient.create(input);
      router.push(`/feedback/${created.id}`);
    } catch (err) {
      setError("root", { message: messageFromError(err) });
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

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onValid)} noValidate className="flex flex-col gap-6">
          <SegmentedField<FeedbackTopic>
            name="topic"
            label="Topic"
            options={TOPIC_OPTIONS}
          />

          <TextField
            name="title"
            label="Title"
            placeholder="A short summary"
            maxLength={TITLE_MAX}
            disabled={isSubmitting}
          />

          <TextareaField
            name="body"
            label="Details"
            placeholder="Describe your bug, idea, or suggestion"
            rows={5}
            disabled={isSubmitting}
          />

          <div className="flex flex-col gap-2">
            <SegmentedField<FeedbackVisibility>
              name="visibility"
              label="Visibility"
              options={VISIBILITY_OPTIONS}
            />
            <Text variant="tertiary" className="text-xs">
              Staff-only posts are visible only to you and the team.
            </Text>
          </div>

          {topic === "translation" && (
            <section className="flex flex-col gap-4 rounded-[15px] border border-border bg-white/[0.02] p-5">
              <Text className="text-sm font-semibold">Translation suggestion</Text>
              <SelectField
                name="locale"
                label="Language"
                options={LANGUAGE_OPTIONS}
                disabled={isSubmitting}
              />
              <TextField
                name="translationContext"
                label="Which text / where you saw it (optional)"
                placeholder="e.g. the Play button on the home screen"
                disabled={isSubmitting}
              />
              <TextareaField
                name="translationSuggestion"
                label="Your suggested wording"
                placeholder="What it should say instead"
                rows={3}
                disabled={isSubmitting}
              />
            </section>
          )}

          {errors.root?.message && (
            <Text role="alert" className="text-sm text-[#ff6b6b]">
              {errors.root.message}
            </Text>
          )}

          <Button type="submit" disabled={isSubmitting} className="h-[50px] w-full">
            {isSubmitting ? "Posting…" : "Post feedback"}
          </Button>
        </form>
      </FormProvider>
    </main>
  );
}
