// Shell-only coverage (T15): the TOC, the intro copy, and the stable anchor
// ids. Each individual section already has its own thorough test file (see
// LanguageSection/AppearanceSection/etc.'s own suites), so every section
// component is stubbed here rather than re-exercising its internals — this
// keeps the suite fast and focused on what SettingsScreen itself owns.
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SettingsScreen } from "./SettingsScreen";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));

vi.mock("@/src/features/settings/LanguageSection", () => ({
  LanguageSection: () => <div>Language section stub</div>,
}));
vi.mock("@/src/features/settings/AppearanceSection", () => ({
  AppearanceSection: () => <div>Appearance section stub</div>,
}));
vi.mock("@/src/features/settings/ConnectedAccountsSection", () => ({
  ConnectedAccountsSection: () => <div>Connected accounts section stub</div>,
}));
vi.mock("@/src/features/settings/PrivacySection", () => ({
  PrivacySection: () => <div>Privacy section stub</div>,
}));
vi.mock("@/src/features/settings/NotificationsSection", () => ({
  NotificationsSection: () => <div>Notifications section stub</div>,
}));
vi.mock("@/src/features/settings/AccountSection", () => ({
  AccountSection: () => <div>Account section stub</div>,
}));
vi.mock("@/src/features/settings/PasswordSection", () => ({
  PasswordSection: () => <div>Password section stub</div>,
}));
vi.mock("@/src/features/settings/ApiTokensPointer", () => ({
  ApiTokensPointer: () => <div>API tokens section stub</div>,
}));
vi.mock("@/src/features/settings/DangerZoneSection", () => ({
  DangerZoneSection: () => <div>Danger zone section stub</div>,
}));

function renderScreen(
  status: "authenticated" | "unauthenticated" | "loading" = "authenticated",
) {
  vi.mocked(useAuth).mockReturnValue({
    status,
    user: null,
  } as ReturnType<typeof useAuth>);
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SettingsScreen />
    </NextIntlClientProvider>,
  );
}

/** The sections that do something without an account. */
const ANONYMOUS_SECTIONS = ["language", "appearance", "privacy", "api-tokens"];

const EXPECTED_SECTIONS = [
  { id: "language", label: "Language" },
  { id: "appearance", label: "Appearance" },
  { id: "connected-accounts", label: "Connected accounts" },
  { id: "privacy", label: "Privacy" },
  { id: "notifications", label: "Notifications" },
  { id: "account", label: "Account" },
  { id: "password", label: "Password" },
  { id: "api-tokens", label: "API tokens" },
  { id: "danger-zone", label: "Danger zone" },
];

describe("SettingsScreen", () => {
  it("renders the page title and the intro copy", () => {
    renderScreen();
    expect(
      screen.getByRole("heading", { level: 1, name: "Preferences" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Everything about your account, in one place. Changes save as you make them — no submit button, except where a password is required.",
      ),
    ).toBeInTheDocument();
  });

  it("renders all 9 sections", () => {
    renderScreen();
    expect(screen.getByText("Language section stub")).toBeInTheDocument();
    expect(screen.getByText("Appearance section stub")).toBeInTheDocument();
    expect(
      screen.getByText("Connected accounts section stub"),
    ).toBeInTheDocument();
    expect(screen.getByText("Privacy section stub")).toBeInTheDocument();
    expect(screen.getByText("Notifications section stub")).toBeInTheDocument();
    expect(screen.getByText("Account section stub")).toBeInTheDocument();
    expect(screen.getByText("Password section stub")).toBeInTheDocument();
    expect(screen.getByText("API tokens section stub")).toBeInTheDocument();
    expect(screen.getByText("Danger zone section stub")).toBeInTheDocument();
  });

  it("gives every section a stable id matching the mock's anchor convention", () => {
    renderScreen();
    for (const { id } of EXPECTED_SECTIONS) {
      expect(document.getElementById(id)).toBeInTheDocument();
    }
  });

  it("renders a TOC with exactly 9 links, each pointing at its section's #id anchor", () => {
    renderScreen();
    const nav = screen.getByRole("navigation", { name: "Preferences" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(EXPECTED_SECTIONS.length);

    EXPECTED_SECTIONS.forEach(({ id, label }, index) => {
      const link = links[index];
      expect(link).toHaveTextContent(label);
      expect(link).toHaveAttribute("href", `#${id}`);
      // The href targets a real element actually on the page.
      expect(document.getElementById(id)).toBeInTheDocument();
    });
  });

  // A signed-out visitor gets the settings that work without an account, and
  // is not shown five sections that could only tell them to log in.
  describe("signed out", () => {
    it("drops the account-only sections from the page and the TOC alike", () => {
      renderScreen("unauthenticated");

      for (const id of ANONYMOUS_SECTIONS) {
        expect(document.getElementById(id)).toBeInTheDocument();
      }
      for (const { id } of EXPECTED_SECTIONS) {
        if (ANONYMOUS_SECTIONS.includes(id)) continue;
        expect(document.getElementById(id)).not.toBeInTheDocument();
      }

      const nav = screen.getByRole("navigation", { name: "Preferences" });
      expect(within(nav).getAllByRole("link")).toHaveLength(
        ANONYMOUS_SECTIONS.length,
      );
    });

    // A TOC entry whose section isn't rendered is a link to nowhere — the one
    // failure mode of filtering the two lists separately.
    it("never leaves a TOC link without its section", () => {
      renderScreen("unauthenticated");
      const nav = screen.getByRole("navigation", { name: "Preferences" });
      for (const link of within(nav).getAllByRole("link")) {
        const id = link.getAttribute("href")!.slice(1);
        expect(document.getElementById(id)).toBeInTheDocument();
      }
    });
  });

  // Hiding on "loading" would drop five sections out of the page and put them
  // back a moment later for the signed-in majority.
  it("keeps every section while auth is still resolving", () => {
    renderScreen("loading");
    for (const { id } of EXPECTED_SECTIONS) {
      expect(document.getElementById(id)).toBeInTheDocument();
    }
  });
});
