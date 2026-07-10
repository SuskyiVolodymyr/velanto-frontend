import type { ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SupportReportScreen } from "./SupportReportScreen";
import { reportsClient } from "@/src/shared/lib/reports-client";
import { packsClient } from "@/src/shared/lib/packs-client";
import { usersClient } from "@/src/shared/lib/users-client";
import { rulesClient } from "@/src/shared/lib/rules-client";
import { useAuth } from "@/src/shared/lib/auth-context";
import type { RulesDocument } from "@/src/shared/types/rules";

vi.mock("@/src/shared/lib/reports-client");
vi.mock("@/src/shared/lib/packs-client");
vi.mock("@/src/shared/lib/users-client");
vi.mock("@/src/shared/lib/rules-client", () => ({
  rulesClient: { getRules: vi.fn() },
}));
vi.mock("@/src/shared/lib/auth-context");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/support/r1",
}));

const mockedReportsClient = vi.mocked(reportsClient);
const mockedPacksClient = vi.mocked(packsClient);
const mockedUsersClient = vi.mocked(usersClient);
const mockedRulesClient = vi.mocked(rulesClient);
const mockedUseAuth = vi.mocked(useAuth);

const RULES: RulesDocument = {
  version: 1,
  categories: [
    { id: "harassment_bullying", title: "Harassment & Bullying", rules: [] },
    { id: "spam_manipulation", title: "Spam & Manipulation", rules: [] },
  ],
};

// The BanReasonPicker uses next-intl, so the ban flow needs a provider.
function renderScreen(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const packReport = {
  id: "r1",
  type: "pack" as const,
  reason: "spam",
  comment: "looks fake",
  targetId: "pack-1",
  roundIndex: null,
  reporterId: "u1",
  reporterUsername: "reporter1",
  status: "new" as const,
  reviewedById: null,
  closedById: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const userReport = { ...packReport, id: "r2", type: "user" as const, targetId: "user-1", reason: "harassment" };

function mockAuth() {
  mockedUseAuth.mockReturnValue({
    user: { id: "mod-1", email: "m@x.com", username: "mod", role: "moderator", createdAt: "" },
    status: "authenticated",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  } as ReturnType<typeof useAuth>);
}

describe("SupportReportScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedRulesClient.getRules.mockResolvedValue(RULES);
  });

  it("shows a not-found message when the report doesn't exist", async () => {
    mockAuth();
    mockedReportsClient.getById.mockRejectedValue(new Error("404"));
    renderScreen(<SupportReportScreen reportId="missing" />);
    await waitFor(() => expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument());
  });

  it("shows Review for a new report and calls review() on click", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedReportsClient.review.mockResolvedValue({ ...packReport, status: "reviewing" });
    renderScreen(<SupportReportScreen reportId="r1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await waitFor(() => expect(mockedReportsClient.review).toHaveBeenCalledWith("r1"));
  });

  it("shows Mark resolved for a new report (no review required first) and calls close()", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedReportsClient.close.mockResolvedValue({ ...packReport, status: "closed" });
    renderScreen(<SupportReportScreen reportId="r1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: /mark resolved/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /mark resolved/i }));
    await waitFor(() => expect(mockedReportsClient.close).toHaveBeenCalledWith("r1"));
  });

  it("hides both queue-action buttons once a report is closed", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue({ ...packReport, status: "closed" });
    renderScreen(<SupportReportScreen reportId="r1" />);
    await waitFor(() => expect(screen.getByText("looks fake")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark resolved/i })).not.toBeInTheDocument();
  });

  it("shows a Delete pack button for a pack-type report and calls packsClient.delete()", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedPacksClient.delete.mockResolvedValue({ deleted: true });
    renderScreen(<SupportReportScreen reportId="r1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: /delete pack/i })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /^ban user$/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /delete pack/i }));
    await waitFor(() => expect(mockedPacksClient.delete).toHaveBeenCalledWith("pack-1"));
    await waitFor(() => expect(screen.getByText(/pack deleted/i)).toBeInTheDocument());
  });

  it("shows Mark resolved but not Review for a reviewing report", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue({ ...packReport, status: "reviewing" });
    renderScreen(<SupportReportScreen reportId="r1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: /mark resolved/i })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Review" })).not.toBeInTheDocument();
  });

  it("shows a Ban user button and inline ban form for a user-type report", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(userReport);
    mockedUsersClient.ban.mockResolvedValue({ id: "user-1", bannedUntil: "2027-01-01T00:00:00.000Z" });
    renderScreen(<SupportReportScreen reportId="r2" />);
    await waitFor(() => expect(screen.getByRole("button", { name: /^ban user$/i })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /delete pack/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^ban user$/i }));
    await screen.findByRole("option", { name: "Harassment & Bullying" });
    await userEvent.selectOptions(screen.getByLabelText("Reason"), "harassment_bullying");
    await userEvent.click(screen.getByRole("button", { name: /confirm ban/i }));
    await waitFor(() =>
      expect(mockedUsersClient.ban).toHaveBeenCalledWith("user-1", {
        duration: "week",
        reason: "harassment_bullying",
      }),
    );
  });

  it("shows an inline error and does not clear state when review() fails", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedReportsClient.review.mockRejectedValue(new Error("network"));
    renderScreen(<SupportReportScreen reportId="r1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await waitFor(() => expect(screen.getByText(/couldn't/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument();
  });

  it("shows an inline error next to Delete pack (not the queue actions) when packsClient.delete() fails, and the button stays clickable", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(packReport);
    mockedPacksClient.delete.mockRejectedValue(new Error("network"));
    renderScreen(<SupportReportScreen reportId="r1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: /delete pack/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /delete pack/i }));
    await waitFor(() => expect(screen.getByText(/couldn't delete this pack/i)).toBeInTheDocument());
    const deleteButton = screen.getByRole("button", { name: /delete pack/i });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).not.toBeDisabled();
    // The error must render alongside Delete pack, not near the queue-action buttons.
    expect(screen.getByText(/couldn't delete this pack/i).parentElement).toBe(deleteButton.parentElement);
  });

  it("shows an inline error and keeps the ban form open when usersClient.ban() fails", async () => {
    mockAuth();
    mockedReportsClient.getById.mockResolvedValue(userReport);
    mockedUsersClient.ban.mockRejectedValue(new Error("network"));
    renderScreen(<SupportReportScreen reportId="r2" />);
    await waitFor(() => expect(screen.getByRole("button", { name: /^ban user$/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /^ban user$/i }));
    await screen.findByRole("option", { name: "Harassment & Bullying" });
    await userEvent.selectOptions(screen.getByLabelText("Reason"), "harassment_bullying");
    await userEvent.click(screen.getByRole("button", { name: /confirm ban/i }));
    await waitFor(() => expect(screen.getByText(/couldn't ban this user/i)).toBeInTheDocument());
    // The form stays open (the reason picker is still on screen).
    expect(screen.getByLabelText("Reason")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm ban/i })).toBeInTheDocument();
  });
});
