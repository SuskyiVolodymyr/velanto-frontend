import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import messages from "@/messages/en.json";
import JoinRoomPage, { generateMetadata } from "./page";

// JoinByLink is a client island that talks to the room client and router (its
// own tests). Stub it to echo the code so we can assert the route threads the
// URL param through.
vi.mock("@/src/features/friends-rooms/JoinByLink", () => ({
  JoinByLink: ({ code }: { code: string }) => <div>JoinByLink:{code}</div>,
}));

// getTranslations needs a request context we don't have in a unit test; back it
// with the real English catalog so the title reads the shipped copy.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(
    async () => (key: string) =>
      (messages.pages as Record<string, string>)[key] ?? key,
  ),
}));

describe("rooms/join/[code] route", () => {
  it("renders JoinByLink with the code from params", async () => {
    const ui = await JoinRoomPage({
      params: Promise.resolve({ code: "ABC123" }),
    });
    render(ui);

    expect(screen.getByText("JoinByLink:ABC123")).toBeInTheDocument();
  });

  it("marks the join route noindex — it is transient and code-bearing", async () => {
    const meta = await generateMetadata();

    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.title).toBe("Joining room");
  });
});
