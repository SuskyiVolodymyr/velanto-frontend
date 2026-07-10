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
    expect(screen.getByRole("heading", { level: 1, name: "Community Rules" })).toBeInTheDocument();
    expect(
      screen.getByText(/keep Velanto safe and fair/i),
    ).toBeInTheDocument();
  });

  it("renders each category as a section with its rules in an ordered list", () => {
    renderScreen(doc);

    expect(screen.getByRole("heading", { level: 2, name: "Conduct" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Content" })).toBeInTheDocument();

    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(2);
    // First category has two rules.
    expect(within(lists[0]).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Be respectful to other players.")).toBeInTheDocument();
    expect(screen.getByText("No illegal content.")).toBeInTheDocument();
  });

  it("renders a graceful error state when rules are null", () => {
    renderScreen(null);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load the rules/i);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
