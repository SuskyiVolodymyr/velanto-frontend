import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pickFromDropdown } from "@/src/shared/test/pick-from-dropdown";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { LanguageSelector } from "./LanguageSelector";
import { setUserLocale } from "@/src/i18n/locale";
import { LOCALES } from "@/src/i18n/config";

vi.mock("@/src/i18n/locale", () => ({ setUserLocale: vi.fn() }));

function renderSelector(locale = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LanguageSelector />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("LanguageSelector", () => {
  // The picker is the app's listbox Dropdown, so the options exist only while
  // the panel is open — the trigger alone carries the current value.
  it("lists every interface language by native name and reflects the current locale", async () => {
    const user = userEvent.setup();
    renderSelector("uk");
    const trigger = screen.getByRole("combobox", {
      name: "Interface language",
    });
    expect(trigger).toHaveTextContent("Українська");

    await user.click(trigger);
    expect(
      screen.getByRole("option", { name: "Українська" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "العربية" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(LOCALES.length);
  });

  it("calls setUserLocale with the chosen locale on change", async () => {
    const user = userEvent.setup();
    renderSelector("en");
    await pickFromDropdown(user, "Interface language", "Українська");
    expect(setUserLocale).toHaveBeenCalledWith("uk");
  });

  // Dropped from the interface in #226 — the picker must not offer them.
  it("does not offer the dropped EU locales", async () => {
    const user = userEvent.setup();
    renderSelector("en");
    await user.click(
      screen.getByRole("combobox", { name: "Interface language" }),
    );
    for (const name of ["Español", "Français", "Português"]) {
      expect(screen.queryByRole("option", { name })).not.toBeInTheDocument();
    }
  });
});
