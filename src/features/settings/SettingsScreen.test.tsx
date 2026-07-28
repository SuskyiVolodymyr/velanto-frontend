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

vi.mock("@/src/features/settings/LanguageSection", () => ({
  LanguageSection: () => <div>Language section stub</div>,
}));
vi.mock("@/src/features/settings/AppearanceSection", () => ({
  AppearanceSection: () => <div>Appearance section stub</div>,
}));
vi.mock("@/src/features/settings/ConnectedAccountsSection", () => ({
  ConnectedAccountsSection: () => (
    <div>Connected accounts section stub</div>
  ),
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

function renderScreen() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SettingsScreen />
    </NextIntlClientProvider>,
  );
}

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
    expect(
      screen.getByText("Notifications section stub"),
    ).toBeInTheDocument();
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
});
