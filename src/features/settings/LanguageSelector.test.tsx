import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { LanguageSelector } from "./LanguageSelector";
import { setUserLocale } from "@/src/i18n/locale";

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
    expect(screen.getByRole("option", { name: "Українська" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "العربية" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(11);
  });

  it("calls setUserLocale with the chosen locale on change", async () => {
    const user = userEvent.setup();
    renderSelector("en");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Interface language" }),
      "es",
    );
    expect(setUserLocale).toHaveBeenCalledWith("es");
  });
});
