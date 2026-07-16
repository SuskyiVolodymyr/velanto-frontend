import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("lists all 11 languages by native name and reflects the current locale", () => {
    renderSelector("uk");
    const select = screen.getByRole("combobox", { name: "Interface language" });
    expect(select).toHaveValue("uk");
    expect(
      screen.getByRole("option", { name: "Українська" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "العربية" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(LOCALES.length);
  });

  it("calls setUserLocale with the chosen locale on change", async () => {
    const user = userEvent.setup();
    renderSelector("en");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Interface language" }),
      "uk",
    );
    expect(setUserLocale).toHaveBeenCalledWith("uk");
  });

  // Dropped from the interface in #226 — the picker must not offer them.
  it("does not offer the dropped EU locales", () => {
    renderSelector("en");
    for (const name of ["Español", "Français", "Português"]) {
      expect(screen.queryByRole("option", { name })).not.toBeInTheDocument();
    }
  });
});
