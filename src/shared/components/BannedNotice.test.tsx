import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { BannedNotice } from "./BannedNotice";
import { formatDate } from "@/src/shared/lib/format-date";
import type { RuleCategory } from "@/src/shared/types/rules";

const CATEGORIES: RuleCategory[] = [
  { id: "spam_manipulation", title: "Spam & Manipulation", rules: [] },
  { id: "hate_discrimination", title: "Hate & Discrimination", rules: [] },
];

function renderNotice(
  props: Partial<React.ComponentProps<typeof BannedNotice>>,
) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <BannedNotice
        bannedUntil={null}
        banReason={null}
        banReasonDetail={null}
        categories={CATEGORIES}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

const inFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const inPast = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const farFuture = "2126-01-01T00:00:00.000Z";

describe("BannedNotice", () => {
  it("renders nothing when the user is not banned", () => {
    const { container } = renderNotice({ bannedUntil: null });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the ban has already expired", () => {
    const { container } = renderNotice({
      bannedUntil: inPast,
      banReason: "spam_manipulation",
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the human category title for the ban reason (from the rules categories)", () => {
    renderNotice({ bannedUntil: inFuture, banReason: "spam_manipulation" });
    expect(screen.getByText("Spam & Manipulation")).toBeInTheDocument();
  });

  it("shows 'Other' for an 'other' ban reason without leaking a raw id", () => {
    renderNotice({
      bannedUntil: inFuture,
      banReason: "other",
      banReasonDetail: "Repeated ToS abuse",
    });
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.queryByText("other")).not.toBeInTheDocument();
  });

  it("shows the free-text detail when present", () => {
    renderNotice({
      bannedUntil: inFuture,
      banReason: "other",
      banReasonDetail: "Repeated ToS abuse",
    });
    expect(screen.getByText("Repeated ToS abuse")).toBeInTheDocument();
  });

  it("shows a dated expiry for a time-limited ban", () => {
    renderNotice({ bannedUntil: inFuture, banReason: "spam_manipulation" });
    expect(
      screen.getByText(new RegExp(formatDate(inFuture))),
    ).toBeInTheDocument();
  });

  it("shows a permanent message instead of a date for a far-future ban", () => {
    renderNotice({ bannedUntil: farFuture, banReason: "spam_manipulation" });
    expect(screen.getByText(/permanent/i)).toBeInTheDocument();
    expect(
      screen.queryByText(new RegExp(formatDate(farFuture))),
    ).not.toBeInTheDocument();
  });

  it("links to the Community Rules page", () => {
    renderNotice({ bannedUntil: inFuture, banReason: "spam_manipulation" });
    expect(
      screen.getByRole("link", { name: /community rules/i }),
    ).toHaveAttribute("href", "/rules");
  });

  it("is announced as an alert and is not dismissible (no close control)", () => {
    renderNotice({ bannedUntil: inFuture, banReason: "spam_manipulation" });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("falls back to the raw reason id only if the category is unknown (rules unavailable)", () => {
    renderNotice({
      bannedUntil: inFuture,
      banReason: "spam_manipulation",
      categories: [],
    });
    // No title available; the notice still renders and shows the id rather than crashing.
    expect(screen.getByText("spam_manipulation")).toBeInTheDocument();
  });
});
