import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ReportUserButton } from "./ReportUserButton";
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
  render(<ReportUserButton userId="user-2" username="Bob" />);
  await user.click(screen.getByRole("button", { name: "Report user" }));
  return user;
}

/** The reason picker is the design's listbox, not a native <select>. */
async function pickReason(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(screen.getByRole("combobox", { name: "Reason" }));
  await user.click(screen.getByRole("option", { name: label }));
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = asUser();
});

describe("ReportUserButton", () => {
  it("blocks a signed-out visitor: the dialog does not open", async () => {
    const user = userEvent.setup();
    currentUser = null;
    render(<ReportUserButton userId="user-2" username="Bob" />);

    await user.click(screen.getByRole("button", { name: "Report user" }));

    expect(screen.queryByText("Report @Bob")).not.toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("offers only the account reasons the backend accepts for type=user", async () => {
    const user = await openDialog();

    expect(screen.getByText("Report @Bob")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Reason" }));
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "Harassment or abuse",
      "Impersonation",
      "Spam or scam",
      "Something else",
    ]);
  });

  it("files a user report against the profile being viewed", async () => {
    create.mockResolvedValue({ id: "report-1" });
    const user = await openDialog();

    await pickReason(user, "Impersonation");
    await user.type(
      screen.getByPlaceholderText(
        "Anything that helps a moderator review this",
      ),
      "  pretending to be staff  ",
    );
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    expect(create).toHaveBeenCalledWith({
      type: "user",
      targetId: "user-2",
      roundIndex: undefined,
      reason: "impersonation",
      comment: "pretending to be staff",
    });
    expect(
      await screen.findByRole("button", { name: "Reported" }),
    ).toBeInTheDocument();
  });

  it("treats an already-reported conflict (409) as success, not an error", async () => {
    create.mockRejectedValue(new ApiError(409, "Conflict", null));
    const user = await openDialog();

    await pickReason(user, "Spam or scam");
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

    await pickReason(user, "Harassment or abuse");
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    expect(
      await screen.findByText("Couldn't submit the report. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByText("Report @Bob")).toBeInTheDocument();
  });
});
