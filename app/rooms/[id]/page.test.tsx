import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import messages from "@/messages/en.json";
import RoomPage, { generateMetadata } from "./page";

// RoomScreen is a client island wired to the socket (its own tests). Stub it to
// echo the roomId so we can assert the route threads the URL param through.
vi.mock("@/src/features/friends-rooms/RoomScreen", () => ({
  RoomScreen: ({ roomId }: { roomId: string }) => (
    <div>RoomScreen:{roomId}</div>
  ),
}));

// getTranslations needs a request context we don't have in a unit test; back it
// with the real English catalog so the title reads the shipped copy.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(
    async () => (key: string) =>
      (messages.pages as Record<string, string>)[key] ?? key,
  ),
}));

describe("rooms/[id] route", () => {
  it("renders RoomScreen with the id from params", async () => {
    const ui = await RoomPage({ params: Promise.resolve({ id: "room-42" }) });
    render(ui);

    expect(screen.getByText("RoomScreen:room-42")).toBeInTheDocument();
  });

  it("marks a live room noindex — it is private and transient", async () => {
    const meta = await generateMetadata();

    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.title).toBe("Live room");
  });
});
