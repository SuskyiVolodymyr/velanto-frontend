import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { PrivacySection } from "./PrivacySection";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";

const STORAGE_KEY = "velanto:streamer-mode";

function renderPrivacySection() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <StreamerModeProvider>
        <PrivacySection />
      </StreamerModeProvider>
    </NextIntlClientProvider>,
  );
}

describe("PrivacySection", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-streamer-mode");
  });
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-streamer-mode");
  });

  it("renders the streamer-mode control defaulting to Off", () => {
    renderPrivacySection();
    expect(screen.getByText("Streamer mode")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Off" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "On" })).toHaveAttribute("aria-checked", "false");
  });

  it("enables streamer mode and persists it when On is chosen", async () => {
    const user = userEvent.setup();
    renderPrivacySection();

    await user.click(screen.getByRole("radio", { name: "On" }));

    expect(screen.getByRole("radio", { name: "On" })).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("on");
  });

  it("reflects an already-stored On value on mount", () => {
    localStorage.setItem(STORAGE_KEY, "on");
    renderPrivacySection();
    expect(screen.getByRole("radio", { name: "On" })).toHaveAttribute("aria-checked", "true");
  });
});
