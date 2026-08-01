"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { feedbackClient } from "@/src/shared/lib/feedback-client";
import { messageFromError } from "@/src/shared/lib/messageFromError";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/src/i18n/config";
import type {
  CreateFeedbackInput,
  FeedbackTopic,
  FeedbackVisibility,
} from "@/src/shared/types/feedback";
import { TOPIC_KEYS } from "@/src/features/feedback/FeedbackCard";
import { feedbackTopicTone } from "@/src/features/feedback/feedback-tone";
import { ComposerChoiceRow } from "@/src/features/feedback/ComposerChoiceRow";
import {
  newFeedbackSchema,
  type NewFeedbackValues,
  BODY_MAX,
  TITLE_MAX,
} from "@/src/features/feedback/new-feedback.schema";
import { Button } from "@/src/shared/components/Button";
import { Text } from "@/src/shared/components/Text";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { FieldError } from "@/src/shared/components/form/FieldError";
import { TextField } from "@/src/shared/components/form/TextField";
import { TextareaField } from "@/src/shared/components/form/TextareaField";
import { SegmentedField } from "@/src/shared/components/form/SegmentedField";
import { getFieldError } from "@/src/shared/components/form/getFieldError";
import { cn } from "@/src/shared/lib/cn";
import { pageContainer } from "@/src/shared/lib/page-container";

const TOPIC_ORDER: FeedbackTopic[] = ["bug", "feature", "translation", "other"];
const VISIBILITY_ORDER: FeedbackVisibility[] = ["everyone", "staff_only"];

// A count only earns attention near the ceiling; below the threshold it stays
// the same tertiary grey as every other hint on the page.
const TITLE_WARN_AT = Math.round(TITLE_MAX * 0.9);
const BODY_WARN_AT = Math.round(BODY_MAX * 0.9);

const FIELD_LABEL = "text-xs text-foreground-secondary";

/**
 * The live `n/max` counter for a length-capped field, for `labelTrailing`.
 * `aria-hidden` on purpose: the control already carries `maxLength`, so a
 * screen reader announcing a second running total is noise, not information.
 */
function CharCount({
  count,
  max,
  warnAt,
}: {
  count: number;
  max: number;
  warnAt: number;
}) {
  return (
    <span
      data-mono
      aria-hidden
      className={cn(
        "text-[11px]",
        count > warnAt ? "text-[#FFD27A]" : "text-foreground-tertiary",
      )}
    >
      {count}/{max}
    </span>
  );
}

export function NewFeedbackForm() {
  const t = useTranslations("feedback");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { status } = useAuth();

  const visibilityOptions = VISIBILITY_ORDER.map((value) => ({
    value,
    label:
      value === "everyone" ? t("visibilityEveryone") : t("visibilityStaffOnly"),
  }));

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
  const title = useWatch({ control, name: "title" });
  const body = useWatch({ control, name: "body" });
  const visibility = useWatch({ control, name: "visibility" });
  const localeError = getFieldError(errors, "locale");

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
      <main className={cn(pageContainer(720), "py-10")}>
        <LoadingState label={t("loading")} showLabel />
      </main>
    );
  }

  if (status === "unauthenticated") return null;

  // The mock renders this as a modal over the board. It's a route here (so it
  // deep-links, survives a reload, and can be the `?next=` target of the
  // sign-in redirect) — the panel below is that modal's body and footer,
  // flattened into the page column.
  return (
    <main className={cn(pageContainer(720), "flex flex-col gap-5 pt-7 pb-20")}>
      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(onValid)}
          noValidate
          className="overflow-hidden rounded-card border border-white/10 bg-surface-card"
        >
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-2">
              <span className={FIELD_LABEL}>{t("topicLabel")}</span>
              <Controller
                name="topic"
                control={control}
                render={({ field }) => (
                  <ComposerChoiceRow<FeedbackTopic>
                    ariaLabel={t("topicLabel")}
                    value={field.value as FeedbackTopic}
                    onSelect={field.onChange}
                    options={TOPIC_ORDER.map((value) => {
                      const { Icon, composerChip } = feedbackTopicTone(value);
                      return {
                        value,
                        label: t(TOPIC_KEYS[value]),
                        icon: <Icon aria-hidden size={13} strokeWidth={2} />,
                        activeClass: composerChip,
                      };
                    })}
                  />
                )}
              />
            </div>

            <TextField
              name="title"
              label={t("titleLabel")}
              labelTrailing={
                <CharCount
                  count={title?.length ?? 0}
                  max={TITLE_MAX}
                  warnAt={TITLE_WARN_AT}
                />
              }
              placeholder={t("titlePlaceholder")}
              maxLength={TITLE_MAX}
              disabled={isSubmitting}
            />

            <TextareaField
              name="body"
              label={t("detailsLabel")}
              labelTrailing={
                <CharCount
                  count={body?.length ?? 0}
                  max={BODY_MAX}
                  warnAt={BODY_WARN_AT}
                />
              }
              // The prompt changes with the topic: "what did you expect?" is
              // the wrong question for a translation fix.
              placeholder={t(
                topic === "bug"
                  ? "detailsPlaceholderBug"
                  : topic === "translation"
                    ? "detailsPlaceholderTranslation"
                    : "detailsPlaceholder",
              )}
              maxLength={BODY_MAX}
              rows={5}
              disabled={isSubmitting}
            />

            <div className="flex flex-col gap-2">
              <SegmentedField<FeedbackVisibility>
                name="visibility"
                label={t("visibilityLabel")}
                options={visibilityOptions}
              />
              {/* Stating what the choice DOES, both ways — a hint that only
                  appears for staff-only reads as a warning about one option
                  rather than a description of the pair. */}
              <Text variant="tertiary" className="text-[11.5px] leading-[1.45]">
                {visibility === "staff_only"
                  ? t("visibilityHintStaffOnly")
                  : t("visibilityHintEveryone")}
              </Text>
            </div>

            {topic === "translation" && (
              <section className="flex flex-col gap-3.5 rounded-[15px] border border-[rgba(255,92,192,0.28)] bg-background p-[15px]">
                <span className="text-[13px] font-bold text-[#FF8BD1]">
                  {t("translationSuggestionHeading")}
                </span>

                <div className="flex flex-col gap-[7px]">
                  <span className={FIELD_LABEL}>{t("languageFieldLabel")}</span>
                  <Controller
                    name="locale"
                    control={control}
                    render={({ field }) => (
                      <ComposerChoiceRow<Locale>
                        ariaLabel={t("languageFieldLabel")}
                        value={field.value as Locale | ""}
                        onSelect={field.onChange}
                        aria-invalid={localeError ? true : undefined}
                        aria-describedby={
                          localeError ? "locale-error" : undefined
                        }
                        options={LOCALES.map((code) => ({
                          value: code,
                          label: LOCALE_NAMES[code],
                          activeClass:
                            "border-[rgba(255,92,192,0.45)] bg-[rgba(255,92,192,0.14)] text-[#FF8BD1]",
                        }))}
                      />
                    )}
                  />
                  {localeError && (
                    <FieldError id="locale-error">{localeError}</FieldError>
                  )}
                </div>

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
              <Text variant="danger" role="alert" className="text-sm">
                {errors.root.message}
              </Text>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-t border-white/[0.07] bg-surface px-5 py-3.5">
            <Text
              variant="tertiary"
              className="max-w-[32ch] text-[11.5px] leading-[1.45]"
            >
              {t("duplicateHint")}
            </Text>
            <Button
              variant="outline"
              size="sm"
              className="ms-auto"
              onClick={() => router.push("/feedback")}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting}>
              {isSubmitting ? t("posting") : t("postFeedback")}
            </Button>
          </div>
        </form>
      </FormProvider>
    </main>
  );
}
