import { z } from "zod";
import { LOCALES } from "@/src/i18n/config";
import { FEEDBACK_TOPICS, FEEDBACK_VISIBILITIES } from "@/src/shared/types/feedback";

// Character limits mirror the old module-level constants (and the backend
// create-feedback.dto's title/body caps).
export const TITLE_MAX = 140;
export const BODY_MAX = 4000;

// Encodes the exact rules the old `validate()` enforced, with the same
// user-facing copy. Title/body are trimmed here so the resolved values feed the
// create payload directly (the old form trimmed at submit). `locale` allows the
// empty-string default (unset) plus any supported locale; the translation
// branch is what makes it required — mirroring the backend superRefine as the
// form actually enforced it (only the translation branch; non-translation
// topics simply omit these fields rather than rejecting them).
export const newFeedbackSchema = z
  .object({
    topic: z.enum(FEEDBACK_TOPICS),
    title: z
      .string()
      .trim()
      .min(1, "Title is required.")
      .max(TITLE_MAX, `Title must be ${TITLE_MAX} characters or fewer.`),
    body: z
      .string()
      .trim()
      .min(1, "Details are required.")
      .max(BODY_MAX, `Details must be ${BODY_MAX} characters or fewer.`),
    visibility: z.enum(FEEDBACK_VISIBILITIES),
    locale: z.union([z.enum(LOCALES), z.literal("")]),
    translationContext: z.string(),
    translationSuggestion: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.topic !== "translation") return;
    if (!data.locale) {
      ctx.addIssue({
        code: "custom",
        path: ["locale"],
        message: "Please choose the language for your translation suggestion.",
      });
    }
    if (!data.translationSuggestion.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["translationSuggestion"],
        message: "Please enter your suggested wording.",
      });
    }
  });

export type NewFeedbackValues = z.infer<typeof newFeedbackSchema>;
