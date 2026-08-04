import { useState } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pickFromDropdown } from "@/src/shared/test/pick-from-dropdown";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "@/src/shared/test/test-query-client";
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
    <QueryClientProvider client={createTestQueryClient()}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <ControlledPicker initial={initial} onChangeSpy={onChangeSpy} />
      </NextIntlClientProvider>
    </QueryClientProvider>
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

/**
 * The picker is disabled until the rules query resolves — its options come from
 * the rule categories. The control is the app's listbox Dropdown, so "disabled"
 * lives on the trigger button rather than on a native select.
 */
async function waitForReasonPicker() {
  const trigger = await screen.findByRole("combobox", { name: "Reason" });
  await waitFor(() => expect(trigger).toBeEnabled());
}

describe("BanReasonPicker", () => {
  it("renders a category option per fetched rules category plus an 'Other' option", async () => {
    render(<Harness />);
    await waitForReasonPicker();
    // A listbox: the options exist only while its panel is open.
    await userEvent.click(screen.getByRole("combobox", { name: "Reason" }));
    const list = within(await screen.findByRole("listbox"));
    // Two categories + 'Other' (+ the disabled placeholder).
    expect(
      list.getByRole("option", { name: "Hate & Discrimination" }),
    ).toBeInTheDocument();
    expect(
      list.getByRole("option", { name: "Spam & Manipulation" }),
    ).toBeInTheDocument();
    expect(list.getByRole("option", { name: "Other" })).toBeInTheDocument();
    // Folded from the retired "single source of truth" test: those titles are
    // the mock's distinctive strings (proving they came from the endpoint),
    // and exactly one fetch happened. The retired test asserted ONLY the
    // call-count, which detected a duplicate fetch — not a hardcoded-labels
    // implementation, which passed it (audit, 2026-07-21).
    expect(mockedRulesClient.getRules).toHaveBeenCalledTimes(1);
  });

  it("shows no detail textarea until a reason is chosen", async () => {
    render(<Harness />);
    await waitForReasonPicker();
    expect(screen.queryByLabelText(/details/i)).not.toBeInTheDocument();
  });

  it("emits the chosen category reason to the parent", async () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);
    await waitForReasonPicker();
    await pickFromDropdown(userEvent, "Reason", "Spam & Manipulation");
    expect(onChangeSpy).toHaveBeenCalledWith({
      reason: "spam_manipulation",
      reasonDetail: "",
    });
  });

  it("is valid once a category is chosen (detail optional for categories)", async () => {
    render(<Harness />);
    await waitForReasonPicker();
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
    await pickFromDropdown(userEvent, "Reason", "Hate & Discrimination");
    await waitFor(() =>
      expect(screen.getByTestId("valid")).toHaveTextContent("true"),
    );
  });

  it("requires non-empty detail when 'Other' is selected", async () => {
    render(<Harness />);
    await waitForReasonPicker();
    await pickFromDropdown(userEvent, "Reason", "Other");

    // Detail textarea now required and visible; empty => invalid.
    const detail = await screen.findByLabelText(/details/i);
    expect(screen.getByTestId("valid")).toHaveTextContent("false");
    expect(screen.getByText(/please add details/i)).toBeInTheDocument();

    await userEvent.type(detail, "context here");
    await waitFor(() =>
      expect(screen.getByTestId("valid")).toHaveTextContent("true"),
    );
  });

  it("caps the detail textarea at 500 characters", async () => {
    render(<Harness />);
    await waitForReasonPicker();
    await pickFromDropdown(userEvent, "Reason", "Other");
    const detail = (await screen.findByLabelText(
      /details/i,
    )) as HTMLTextAreaElement;
    expect(detail.maxLength).toBe(500);
  });

  describe("isBanReasonValid", () => {
    it("rejects an unchosen reason", () => {
      expect(isBanReasonValid({ reason: "", reasonDetail: "" })).toBe(false);
    });
    it("accepts a category with no detail", () => {
      expect(
        isBanReasonValid({ reason: "spam_manipulation", reasonDetail: "" }),
      ).toBe(true);
    });
    it("rejects 'other' with blank detail", () => {
      expect(isBanReasonValid({ reason: "other", reasonDetail: "   " })).toBe(
        false,
      );
    });
    it("accepts 'other' with detail", () => {
      expect(isBanReasonValid({ reason: "other", reasonDetail: "x" })).toBe(
        true,
      );
    });
    it("rejects detail longer than 500 chars", () => {
      expect(
        isBanReasonValid({ reason: "other", reasonDetail: "a".repeat(501) }),
      ).toBe(false);
    });
  });

  describe("buildBanReasonPayload", () => {
    it("omits reasonDetail for a category with no detail", () => {
      expect(
        buildBanReasonPayload({
          reason: "spam_manipulation",
          reasonDetail: "",
        }),
      ).toEqual({
        reason: "spam_manipulation",
      });
    });
    it("includes trimmed reasonDetail for a category when provided", () => {
      expect(
        buildBanReasonPayload({
          reason: "spam_manipulation",
          reasonDetail: "  note  ",
        }),
      ).toEqual({
        reason: "spam_manipulation",
        reasonDetail: "note",
      });
    });
    it("includes trimmed reasonDetail for 'other'", () => {
      expect(
        buildBanReasonPayload({ reason: "other", reasonDetail: "  because  " }),
      ).toEqual({
        reason: "other",
        reasonDetail: "because",
      });
    });
  });
});
