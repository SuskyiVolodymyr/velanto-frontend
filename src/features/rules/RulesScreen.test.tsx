import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { RulesScreen } from "./RulesScreen";
import type { RulesDocument } from "./get-rules-server";

const doc: RulesDocument = {
  version: 2,
  categories: [
    {
      id: "conduct",
      title: "Conduct",
      rules: [
        { number: 1, text: "Be respectful to other players." },
        { number: 2, text: "No harassment." },
      ],
    },
    {
      id: "content",
      title: "Content",
      rules: [{ number: 1, text: "No illegal content." }],
    },
  ],
};

function renderScreen(rules: RulesDocument | null) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <RulesScreen rules={rules} />
    </NextIntlClientProvider>,
  );
}

describe("RulesScreen", () => {
  it("renders the heading and intro", () => {
    renderScreen(doc);
    expect(
      screen.getByRole("heading", { level: 1, name: "Community Rules" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/keep Velanto safe and fair/i)).toBeInTheDocument();
  });

  it("renders each category as a section with its rules in an ordered list", () => {
    renderScreen(doc);

    expect(
      screen.getByRole("heading", { level: 2, name: "Conduct" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Content" }),
    ).toBeInTheDocument();

    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(2);
    // First category has two rules.
    expect(within(lists[0]).getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen.getByText("Be respectful to other players."),
    ).toBeInTheDocument();
    expect(screen.getByText("No illegal content.")).toBeInTheDocument();
  });

  it("prefers localized catalog text over the backend text, by category id and rule number, and falls back when absent", () => {
    const localizedMessages = {
      ...messages,
      rules: {
        ...messages.rules,
        content: {
          hate_discrimination: {
            title: "Localized Title",
            items: { "1": "Localized rule one" },
          },
        },
      },
    };
    const backendDoc: RulesDocument = {
      version: 1,
      categories: [
        {
          id: "hate_discrimination",
          title: "Backend Title",
          rules: [
            { number: 1, text: "Backend rule one" },
            { number: 2, text: "Backend rule two" },
          ],
        },
        {
          id: "uncovered_category",
          title: "Backend Uncovered",
          rules: [{ number: 1, text: "Backend uncovered rule" }],
        },
      ],
    };

    render(
      <NextIntlClientProvider locale="en" messages={localizedMessages}>
        <RulesScreen rules={backendDoc} />
      </NextIntlClientProvider>,
    );

    // Category + rule covered by the catalog: the localized text wins.
    expect(
      screen.getByRole("heading", { level: 2, name: "Localized Title" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Localized rule one")).toBeInTheDocument();
    // Backend title must not leak through when the catalog covers it.
    expect(screen.queryByText("Backend Title")).not.toBeInTheDocument();

    // Rule number missing from the catalog: falls back to the backend text.
    expect(screen.getByText("Backend rule two")).toBeInTheDocument();

    // Category absent from the catalog: falls back to the backend title + text.
    expect(
      screen.getByRole("heading", { level: 2, name: "Backend Uncovered" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Backend uncovered rule")).toBeInTheDocument();
  });

  it("falls back to the backend text when the catalog has no rules.content at all", () => {
    const rulesWithoutContent: Record<string, unknown> = { ...messages.rules };
    delete rulesWithoutContent.content;
    const messagesWithoutContent = {
      ...messages,
      rules: rulesWithoutContent,
    };

    render(
      <NextIntlClientProvider locale="en" messages={messagesWithoutContent}>
        <RulesScreen rules={doc} />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Conduct" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Be respectful to other players."),
    ).toBeInTheDocument();
  });

  it("renders a graceful error state when rules are null", () => {
    renderScreen(null);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load the rules/i,
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
