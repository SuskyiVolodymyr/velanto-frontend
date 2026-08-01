import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ReportPackDialog } from "./ReportPackDialog";
import { ApiError } from "@/src/shared/lib/api-client";
import type { User } from "@/src/shared/types/user";

const create = vi.fn();
vi.mock("@/src/shared/lib/reports-client", () => ({
  reportsClient: {
    create: (...args: unknown[]) => create(...args),
  },
}));

let currentUser: User | null;
vi.mock("@/src/shared/lib/auth-context", () => ({
  useAuth: () => ({ user: currentUser }),
}));

function asUser(): User {
  return {
    id: "u1",
    email: null,
    username: "Alice",
    role: "user",
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

async function openDialog() {
  const user = userEvent.setup();
  render(<ReportPackDialog packId="pack-1" />);
  await user.click(screen.getByRole("button", { name: "Report" }));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = asUser();
});

/**
 * The reason picker is the design's listbox {@link Dropdown}, not a native
 * <select>: open the trigger, then click the option by its visible label.
 */
async function pickReason(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(screen.getByRole("combobox", { name: "Reason" }));
  await user.click(screen.getByRole("option", { name: label }));
}

describe("ReportPackDialog", () => {
  it("blocks a signed-out visitor: the dialog does not open", async () => {
    const user = userEvent.setup();
    currentUser = null;
    render(<ReportPackDialog packId="pack-1" />);

    await user.click(screen.getByRole("button", { name: "Report" }));

    expect(screen.queryByText("Report this pack")).not.toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("opens a dialog with a reason picker and optional comment field", async () => {
    await openDialog();

    expect(screen.getByText("Report this pack")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Reason" }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Anything that helps a moderator review this",
      ),
    ).toBeInTheDocument();
  });

  it("disables submit until a reason is chosen", async () => {
    await openDialog();

    expect(
      screen.getByRole("button", { name: "Submit report" }),
    ).toBeDisabled();
  });

  it("submits the chosen reason and trimmed comment, then shows the Reported state", async () => {
    create.mockResolvedValue({ id: "report-1" });
    const user = await openDialog();

    await pickReason(user, "Spam or misleading");
    await user.type(
      screen.getByPlaceholderText(
        "Anything that helps a moderator review this",
      ),
      "  looks like spam  ",
    );
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    expect(create).toHaveBeenCalledWith({
      type: "pack",
      targetId: "pack-1",
      reason: "spam",
      comment: "looks like spam",
    });
    expect(
      await screen.findByRole("button", { name: "Reported" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Report this pack")).not.toBeInTheDocument();
  });

  it("omits the comment field entirely when left blank", async () => {
    create.mockResolvedValue({ id: "report-1" });
    const user = await openDialog();

    await pickReason(user, "Something else");
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    expect(create).toHaveBeenCalledWith({
      type: "pack",
      targetId: "pack-1",
      reason: "other",
      comment: undefined,
    });
  });

  it("treats an already-reported conflict (409) as success, not an error", async () => {
    create.mockRejectedValue(new ApiError(409, "Conflict", null));
    const user = await openDialog();

    await pickReason(user, "Spam or misleading");
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    expect(
      await screen.findByRole("button", { name: "Reported" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Couldn't submit the report. Try again."),
    ).not.toBeInTheDocument();
  });

  it("shows an error and keeps the dialog open on a real failure", async () => {
    create.mockRejectedValue(new ApiError(500, "Server Error", null));
    const user = await openDialog();

    await pickReason(user, "Spam or misleading");
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    expect(
      await screen.findByText("Couldn't submit the report. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByText("Report this pack")).toBeInTheDocument();
  });

  it("does not reopen the dialog once already reported", async () => {
    create.mockResolvedValue({ id: "report-1" });
    const user = await openDialog();
    await pickReason(user, "Spam or misleading");
    await user.click(screen.getByRole("button", { name: "Submit report" }));
    await screen.findByRole("button", { name: "Reported" });

    await user.click(screen.getByRole("button", { name: "Reported" }));

    expect(screen.queryByText("Report this pack")).not.toBeInTheDocument();
  });
});
