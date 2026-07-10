import { useState } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import {
  BanReasonPicker,
  isBanReasonValid,
  buildBanReasonPayload,
  type BanReasonState,
} from "./BanReasonPicker";
import { rulesClient } from "@/src/shared/lib/rules-client";
import type { RulesDocument } from "@/src/shared/types/rules";

vi.mock("@/src/shared/lib/rules-client", () => ({
  rulesClient: { getRules: vi.fn() },
}));

const RULES: RulesDocument = {
  version: 3,
  categories: [
    { id: "hate_discrimination", title: "Hate & Discrimination", rules: [] },
    { id: "spam_manipulation", title: "Spam & Manipulation", rules: [] },
  ],
};

const mockedRulesClient = vi.mocked(rulesClient);

/** Controlled test harness: owns the picker state so we can assert emitted payloads. */
function Harness({
  initial = { reason: "", reasonDetail: "" },
  onChangeSpy,
}: {
  initial?: BanReasonState;
  onChangeSpy?: (next: BanReasonState) => void;
}) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <ControlledPicker initial={initial} onChangeSpy={onChangeSpy} />
    </NextIntlClientProvider>
  );
}

// Minimal controlled wrapper using React state, defined inline to keep the test
// self-contained.
function ControlledPicker({
  initial,
  onChangeSpy,
}: {
  initial: BanReasonState;
  onChangeSpy?: (next: BanReasonState) => void;
}) {
  const [state, setState] = useState<BanReasonState>(initial);
  return (
    <div>
      <BanReasonPicker
        idPrefix="t"
        value={state}
        onChange={(next) => {
          setState(next);
          onChangeSpy?.(next);
        }}
      />
      <span data-testid="valid">{String(isBanReasonValid(state))}</span>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRulesClient.getRules.mockResolvedValue(RULES);
});

describe("BanReasonPicker", () => {
  it("renders a category option per fetched rules category plus an 'Other' option", async () => {
    render(<Harness />);
    const select = await screen.findByLabelText("Reason");
    // Two categories + 'Other' (+ the disabled placeholder).
    expect(within(select).getByRole("option", { name: "Hate & Discrimination" })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "Spam & Manipulation" })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "Other" })).toBeInTheDocument();
  });

  it("does not fetch category titles from anything but the rules endpoint (single source of truth)", async () => {
    render(<Harness />);
    await screen.findByLabelText("Reason");
    expect(mockedRulesClient.getRules).toHaveBeenCalledTimes(1);
  });

  it("shows no detail textarea until a reason is chosen", async () => {
    render(<Harness />);
    await screen.findByLabelText("Reason");
    expect(screen.queryByLabelText(/details/i)).not.toBeInTheDocument();
  });

  it("emits the chosen category reason to the parent", async () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);
    const select = await screen.findByLabelText("Reason");
    await userEvent.selectOptions(select, "spam_manipulation");
    expect(onChangeSpy).toHaveBeenCalledWith({ reason: "spam_manipulation", reasonDetail: "" });
  });

  it("is valid once a category is chosen (detail optional for categories)", async () => {
    render(<Harness />);
    const select = await screen.findByLabelText("Reason");
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
    await userEvent.selectOptions(select, "hate_discrimination");
    await waitFor(() => expect(screen.getByTestId("valid")).toHaveTextContent("true"));
  });

  it("requires non-empty detail when 'Other' is selected", async () => {
    render(<Harness />);
    const select = await screen.findByLabelText("Reason");
    await userEvent.selectOptions(select, "other");

    // Detail textarea now required and visible; empty => invalid.
    const detail = await screen.findByLabelText(/details/i);
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
    expect(screen.getByText(/please add details/i)).toBeInTheDocument();

    await userEvent.type(detail, "context here");
    await waitFor(() => expect(screen.getByTestId("valid")).toHaveTextContent("true"));
  });

  it("caps the detail textarea at 500 characters", async () => {
    render(<Harness />);
    const select = await screen.findByLabelText("Reason");
    await userEvent.selectOptions(select, "other");
    const detail = (await screen.findByLabelText(/details/i)) as HTMLTextAreaElement;
    expect(detail.maxLength).toBe(500);
  });

  describe("isBanReasonValid", () => {
    it("rejects an unchosen reason", () => {
      expect(isBanReasonValid({ reason: "", reasonDetail: "" })).toBe(false);
    });
    it("accepts a category with no detail", () => {
      expect(isBanReasonValid({ reason: "spam_manipulation", reasonDetail: "" })).toBe(true);
    });
    it("rejects 'other' with blank detail", () => {
      expect(isBanReasonValid({ reason: "other", reasonDetail: "   " })).toBe(false);
    });
    it("accepts 'other' with detail", () => {
      expect(isBanReasonValid({ reason: "other", reasonDetail: "x" })).toBe(true);
    });
    it("rejects detail longer than 500 chars", () => {
      expect(isBanReasonValid({ reason: "other", reasonDetail: "a".repeat(501) })).toBe(false);
    });
  });

  describe("buildBanReasonPayload", () => {
    it("omits reasonDetail for a category with no detail", () => {
      expect(buildBanReasonPayload({ reason: "spam_manipulation", reasonDetail: "" })).toEqual({
        reason: "spam_manipulation",
      });
    });
    it("includes trimmed reasonDetail for a category when provided", () => {
      expect(buildBanReasonPayload({ reason: "spam_manipulation", reasonDetail: "  note  " })).toEqual({
        reason: "spam_manipulation",
        reasonDetail: "note",
      });
    });
    it("includes trimmed reasonDetail for 'other'", () => {
      expect(buildBanReasonPayload({ reason: "other", reasonDetail: "  because  " })).toEqual({
        reason: "other",
        reasonDetail: "because",
      });
    });
  });
});
