import { describe, it, expect } from "vitest";
import {
  newFeedbackSchema,
  type NewFeedbackValues,
} from "./new-feedback.schema";

function makeValues(
  overrides: Partial<NewFeedbackValues> = {},
): NewFeedbackValues {
  return {
    topic: "bug",
    title: "A title",
    body: "Some details",
    visibility: "everyone",
    locale: "",
    translationContext: "",
    translationSuggestion: "",
    ...overrides,
  };
}

function firstMessage(
  values: NewFeedbackValues,
  path: string,
): string | undefined {
  const result = newFeedbackSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join(".") === path)
    ?.message;
}

describe("newFeedbackSchema", () => {
  it("accepts a bug post with title + body", () => {
    expect(newFeedbackSchema.safeParse(makeValues()).success).toBe(true);
  });

  it("rejects an empty title with the original message", () => {
    expect(firstMessage(makeValues({ title: "   " }), "title")).toBe(
      "Title is required.",
    );
  });

  it("rejects an over-long title with the original message", () => {
    expect(firstMessage(makeValues({ title: "a".repeat(141) }), "title")).toBe(
      "Title must be 140 characters or fewer.",
    );
  });

  it("rejects empty details with the original message", () => {
    expect(firstMessage(makeValues({ body: "  " }), "body")).toBe(
      "Details are required.",
    );
  });

  it("rejects over-long details with the original message", () => {
    expect(firstMessage(makeValues({ body: "a".repeat(4001) }), "body")).toBe(
      "Details must be 4000 characters or fewer.",
    );
  });

  it("requires the locale for a translation post", () => {
    expect(
      firstMessage(
        makeValues({
          topic: "translation",
          locale: "",
          translationSuggestion: "Better wording",
        }),
        "locale",
      ),
    ).toBe("Please choose the language for your translation suggestion.");
  });

  it("requires the suggestion for a translation post", () => {
    expect(
      firstMessage(
        makeValues({
          topic: "translation",
          locale: "uk",
          translationSuggestion: "  ",
        }),
        "translationSuggestion",
      ),
    ).toBe("Please enter your suggested wording.");
  });

  it("accepts a valid translation post", () => {
    expect(
      newFeedbackSchema.safeParse(
        makeValues({
          topic: "translation",
          locale: "uk",
          translationSuggestion: "Better wording",
        }),
      ).success,
    ).toBe(true);
  });

  it("does not require translation fields for non-translation topics", () => {
    expect(
      newFeedbackSchema.safeParse(makeValues({ topic: "feature" })).success,
    ).toBe(true);
  });

  it("trims title and body in the parsed output", () => {
    const result = newFeedbackSchema.safeParse(
      makeValues({ title: "  hi  ", body: "  yo  " }),
    );
    expect(result.success && result.data.title).toBe("hi");
    expect(result.success && result.data.body).toBe("yo");
  });
});
