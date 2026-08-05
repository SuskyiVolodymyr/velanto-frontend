// src/features/admin/UserBanForm.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient as render } from "@/src/shared/test/render-with-query-client";
import userEvent from "@testing-library/user-event";
import { pickFromDropdown } from "@/src/shared/test/pick-from-dropdown";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { useState } from "react";
import { UserBanForm } from "./UserBanForm";
import { rulesClient } from "@/src/shared/lib/rules-client";
import type { BanDuration } from "@/src/shared/lib/users-client";
import type { BanReasonState } from "@/src/shared/components/BanReasonPicker";
import type { RulesDocument } from "@/src/shared/types/rules";

vi.mock("@/src/shared/lib/rules-client", () => ({
  rulesClient: { getRules: vi.fn() },
}));

const RULES: RulesDocument = {
  version: 1,
  categories: [
    { id: "spam_manipulation", title: "Spam & Manipulation", rules: [] },
  ],
};

/**
 * `UserBanForm` is fully controlled, so this harness owns the duration/reason
 * state a real caller (`UserRow.tsx`, `AdminUserDetailScreen.tsx`) would —
 * letting these tests drive it exactly like a real consumer rather than
 * asserting on a form that can never actually reach a valid state.
 */
function Harness({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [duration, setDuration] = useState<BanDuration>("week");
  const [reason, setReason] = useState<BanReasonState>({
    reason: "",
    reasonDetail: "",
  });
  return (
    <UserBanForm
      userId="u2"
      banDuration={duration}
      banReason={reason}
      loading={loading}
      onDurationChange={setDuration}
      onReasonChange={setReason}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

function renderForm(props: {
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Harness {...props} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(rulesClient.getRules).mockResolvedValue(RULES);
});

describe("UserBanForm", () => {
  it("keeps Confirm disabled until a reason is picked, then calls onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderForm({ onConfirm, onCancel });

    const confirmButton = screen.getByRole("button", { name: "Confirm ban" });
    expect(confirmButton).toBeDisabled();

    const reasonSelect = screen.getByRole("combobox", { name: "Reason" });
    await waitFor(() => expect(reasonSelect).toBeEnabled());
    await pickFromDropdown(user, "Reason", "Spam & Manipulation");
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel and never onConfirm when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderForm({ onConfirm, onCancel });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables Cancel while a submission is in flight", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderForm({ onConfirm, onCancel, loading: true });

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
