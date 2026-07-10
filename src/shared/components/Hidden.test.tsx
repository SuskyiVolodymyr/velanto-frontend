import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import messages from "@/messages/en.json";
import { Hidden, type HiddenKind } from "./Hidden";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";

const STORAGE_KEY = "velanto:streamer-mode";

function renderHidden(kind: HiddenKind, child: ReactNode = "SecretValue") {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <StreamerModeProvider>
        <Hidden kind={kind} id="item-1">
          {child}
        </Hidden>
      </StreamerModeProvider>
    </NextIntlClientProvider>,
  );
}

describe("Hidden", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  describe("streamer mode off", () => {
    it.each<HiddenKind>(["avatar", "name", "comment"])(
      "renders children unchanged for kind=%s",
      (kind) => {
        renderHidden(kind);
        expect(screen.getByText("SecretValue")).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
      },
    );
  });

  describe("streamer mode on", () => {
    beforeEach(() => localStorage.setItem(STORAGE_KEY, "on"));

    it.each<HiddenKind>(["avatar", "name", "comment"])(
      "hides children and shows a reveal control for kind=%s",
      (kind) => {
        renderHidden(kind);
        expect(screen.queryByText("SecretValue")).not.toBeInTheDocument();
        // The reveal control is a button with an accessible name mentioning "Reveal".
        expect(
          screen.getByRole("button", { name: /reveal/i }),
        ).toBeInTheDocument();
      },
    );

    it("exposes the hint accessibly and associates it with the reveal button (name)", () => {
      renderHidden("name");
      const button = screen.getByRole("button", { name: /reveal/i });
      const describedBy = button.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      const hint = document.getElementById(describedBy as string);
      expect(hint).toHaveTextContent("Hidden because of streamer mode");
    });

    it("shows the hint text for a hidden comment", () => {
      renderHidden("comment");
      expect(
        screen.getByText("Hidden because of streamer mode"),
      ).toBeInTheDocument();
    });

    it("reveals only that item when its Reveal button is clicked", async () => {
      const user = userEvent.setup();
      renderHidden("name");
      expect(screen.queryByText("SecretValue")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /reveal/i }));

      expect(screen.getByText("SecretValue")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /reveal/i }),
      ).not.toBeInTheDocument();
    });

    it("keeps a sibling item hidden when another is revealed", async () => {
      const user = userEvent.setup();
      localStorage.setItem(STORAGE_KEY, "on");
      render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <StreamerModeProvider>
            <div data-testid="first">
              <Hidden kind="name" id="a">
                Alice
              </Hidden>
            </div>
            <div data-testid="second">
              <Hidden kind="name" id="b">
                Bob
              </Hidden>
            </div>
          </StreamerModeProvider>
        </NextIntlClientProvider>,
      );

      const first = within(screen.getByTestId("first"));
      await user.click(first.getByRole("button", { name: /reveal/i }));

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    });
  });
});
