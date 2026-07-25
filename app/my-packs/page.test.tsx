import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import messages from "@/messages/en.json";
import MyPacksPage, { generateMetadata } from "./page";

// MyPacksFeed is an auth-gated client island with its own tests. Stub it so this
// test only asserts the route mounts it and frames it with a heading.
vi.mock("@/src/features/home/MyPacksFeed", () => ({
  MyPacksFeed: () => <div>MyPacksFeed island</div>,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(
    async () => (key: string) =>
      (messages.myPacks as Record<string, string>)[key] ?? key,
  ),
}));

describe("/my-packs route", () => {
  it("renders the My packs heading and the MyPacksFeed island", async () => {
    render(await MyPacksPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "My packs" }),
    ).toBeInTheDocument();
    expect(screen.getByText("MyPacksFeed island")).toBeInTheDocument();
  });

  it("is noindex — a private per-user view, not a landing page", async () => {
    const meta = await generateMetadata();

    expect(meta.title).toEqual({ absolute: "My packs — Velanto" });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});
