import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserAvatar } from "./UserAvatar";

vi.mock("@/src/shared/lib/media-url", () => ({
  mediaUrl: (key: string) => `https://cdn.test/${key}`,
}));

describe("UserAvatar", () => {
  it("renders the uppercased first initial when there is no avatarKey", () => {
    render(<UserAvatar username="quinn" />);
    expect(screen.getByText("Q")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("falls back to '?' for an empty username", () => {
    render(<UserAvatar username="   " />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("renders an image resolved from the avatarKey when present", () => {
    render(
      <UserAvatar
        username="quinn"
        avatarKey="media/avatar/abc.webp"
        className="h-11 w-11 rounded-full"
      />,
    );
    const img = document.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute(
      "src",
      "https://cdn.test/media/avatar/abc.webp",
    );
    // Size/shape classes from the caller are applied, plus object-cover.
    expect(img).toHaveClass("h-11", "w-11", "rounded-full", "object-cover");
    // No initial is rendered alongside the image.
    expect(screen.queryByText("Q")).not.toBeInTheDocument();
  });

  it("keeps the avatar decorative (aria-hidden, empty alt) so it doesn't double-announce the adjacent @handle", () => {
    render(<UserAvatar username="quinn" avatarKey="media/avatar/abc.webp" />);
    const img = document.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
  });

  it("falls back to the initial when avatarKey is null", () => {
    render(<UserAvatar username="quinn" avatarKey={null} />);
    expect(screen.getByText("Q")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
