import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { AvatarLightbox } from "./AvatarLightbox";

vi.mock("@/src/shared/lib/media-url", () => ({
  mediaUrl: (key: string) => `https://cdn.test/${key}`,
}));

describe("AvatarLightbox", () => {
  it("opens an enlarged view when the avatar has an image", async () => {
    const user = userEvent.setup();
    render(<AvatarLightbox username="alice" avatarKey="media/avatar/a.webp" />);

    await user.click(screen.getByRole("button", { name: "alice's avatar" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("avatar-enlarged")).toHaveAttribute(
      "src",
      "https://cdn.test/media/avatar/a.webp",
    );
  });

  it("is not interactive and shows initials when there is no avatar image", () => {
    render(<AvatarLightbox username="bob" avatarKey={null} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("closes the enlarged view on Escape", async () => {
    const user = userEvent.setup();
    render(<AvatarLightbox username="alice" avatarKey="media/avatar/a.webp" />);

    await user.click(screen.getByRole("button", { name: "alice's avatar" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
