"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { LOCALES, LOCALE_NAMES } from "@/src/i18n/config";
import type {
  CreateFeedbackInput,
  FeedbackTopic,
  FeedbackVisibility,
} from "@/src/shared/types/feedback";
import { TOPIC_KEYS } from "@/src/features/feedback/FeedbackCard";
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
const VISIBILITY_ORDER: FeedbackVisibility[] = ["everyone", "staff_only"];

export function NewFeedbackForm() {
  const t = useTranslations("feedback");
  const router = useRouter();
  const { status } = useAuth();

  const topicOptions = TOPIC_ORDER.map((value) => ({
    value,
    label: t(TOPIC_KEYS[value]),
  }));
  const visibilityOptions = VISIBILITY_ORDER.map((value) => ({
    value,
    label:
      value === "everyone" ? t("visibilityEveryone") : t("visibilityStaffOnly"),
  }));
  const languageOptions = [
    { value: "", label: t("chooseLanguage") },
    ...LOCALES.map((code) => ({ value: code, label: LOCALE_NAMES[code] })),
  ];

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
        <Text variant="secondary">{t("loading")}</Text>
      </main>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <main className="mx-auto w-full max-w-2xl px-7 py-10">
      <Text as="h1" variant="title" className="mb-6 text-2xl">
        {t("newFeedbackTitle")}
      </Text>

      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(onValid)}
          noValidate
          className="flex flex-col gap-6"
        >
          <SegmentedField<FeedbackTopic>
            name="topic"
            label={t("topicLabel")}
            options={topicOptions}
          />

          <TextField
            name="title"
            label={t("titleLabel")}
            placeholder={t("titlePlaceholder")}
            maxLength={TITLE_MAX}
            disabled={isSubmitting}
          />

          <TextareaField
            name="body"
            label={t("detailsLabel")}
            placeholder={t("detailsPlaceholder")}
            rows={5}
            disabled={isSubmitting}
          />

          <div className="flex flex-col gap-2">
            <SegmentedField<FeedbackVisibility>
              name="visibility"
              label={t("visibilityLabel")}
              options={visibilityOptions}
            />
            <Text variant="tertiary" className="text-xs">
              {t("staffOnlyHint")}
            </Text>
          </div>

          {topic === "translation" && (
            <section className="flex flex-col gap-4 rounded-[15px] border border-border bg-white/[0.02] p-5">
              <Text className="text-sm font-semibold">
                {t("translationSuggestionHeading")}
              </Text>
              <SelectField
                name="locale"
                label={t("languageFieldLabel")}
                options={languageOptions}
                disabled={isSubmitting}
              />
              <TextField
                name="translationContext"
                label={t("contextFieldLabel")}
                placeholder={t("contextPlaceholder")}
                disabled={isSubmitting}
              />
              <TextareaField
                name="translationSuggestion"
                label={t("suggestionFieldLabel")}
                placeholder={t("suggestionPlaceholder")}
                rows={3}
                disabled={isSubmitting}
              />
            </section>
          )}

          {errors.root?.message && (
            <Text role="alert" className="text-sm text-danger">
              {errors.root.message}
            </Text>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-[50px] w-full"
          >
            {isSubmitting ? t("posting") : t("postFeedback")}
          </Button>
        </form>
      </FormProvider>
    </main>
  );
}
