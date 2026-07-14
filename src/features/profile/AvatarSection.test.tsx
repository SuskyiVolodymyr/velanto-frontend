import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { AvatarSection } from "./AvatarSection";
import { uploadMedia, MEDIA_MAX_BYTES } from "@/src/shared/lib/media-client";
import { usersClient } from "@/src/shared/lib/users-client";
import { useAuth } from "@/src/shared/lib/auth-context";

vi.mock("@/src/shared/lib/media-client", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/shared/lib/media-client")
  >("@/src/shared/lib/media-client");
  return { ...actual, uploadMedia: vi.fn() };
});
vi.mock("@/src/shared/lib/users-client", () => ({
  usersClient: { setAvatar: vi.fn(), removeAvatar: vi.fn() },
}));
vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));
vi.mock("@/src/shared/lib/media-url", () => ({
  mediaUrl: (key: string) => `https://cdn.test/${key}`,
}));

const setAvatarKey = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    setAvatarKey,
  } as unknown as ReturnType<typeof useAuth>);
});

function renderSection(avatarKey: string | null = null) {
  return render(
    <AvatarSection userId="u1" username="alice" avatarKey={avatarKey} />,
  );
}

function pngFile(bytes = 10): File {
  return new File([new Uint8Array(bytes)], "pic.png", { type: "image/png" });
}

describe("AvatarSection", () => {
  it("uploads a valid image, sets it, and patches the header avatar", async () => {
    vi.mocked(uploadMedia).mockResolvedValue({
      key: "media/avatar/new.webp",
      url: "https://cdn.test/media/avatar/new.webp",
      byteSize: 10,
    });
    vi.mocked(usersClient.setAvatar).mockResolvedValue({
      id: "u1",
      avatarKey: "media/avatar/new.webp",
    });
    const user = userEvent.setup();
    renderSection(null);

    await user.upload(screen.getByLabelText("Change photo"), pngFile());

    await waitFor(() =>
      expect(uploadMedia).toHaveBeenCalledWith(expect.any(File), "avatar"),
    );
    expect(usersClient.setAvatar).toHaveBeenCalledWith("media/avatar/new.webp");
    await waitFor(() =>
      expect(setAvatarKey).toHaveBeenCalledWith("media/avatar/new.webp"),
    );
  });

  it("rejects a non-image without uploading", async () => {
    renderSection(null);

    // fireEvent (not userEvent.upload) so the non-image file isn't filtered out
    // by the input's accept="image/*" — we're testing the component's own
    // client-side type check, which is the defense behind that attribute.
    fireEvent.change(screen.getByLabelText("Change photo"), {
      target: {
        files: [new File(["x"], "notes.txt", { type: "text/plain" })],
      },
    });

    expect(
      await screen.findByText("Choose an image file."),
    ).toBeInTheDocument();
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("rejects an image over 1 MB without uploading", async () => {
    const user = userEvent.setup();
    renderSection(null);

    await user.upload(
      screen.getByLabelText("Change photo"),
      pngFile(MEDIA_MAX_BYTES + 1),
    );

    expect(
      await screen.findByText("Image must be 1 MB or smaller."),
    ).toBeInTheDocument();
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("surfaces an upload failure to the user", async () => {
    vi.mocked(uploadMedia).mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    renderSection(null);

    await user.upload(screen.getByLabelText("Change photo"), pngFile());

    expect(
      await screen.findByText("Upload failed. Try again."),
    ).toBeInTheDocument();
    expect(setAvatarKey).not.toHaveBeenCalled();
  });

  it("removes an existing avatar and clears the header copy", async () => {
    vi.mocked(usersClient.removeAvatar).mockResolvedValue({
      id: "u1",
      avatarKey: null,
    });
    const user = userEvent.setup();
    renderSection("media/avatar/old.webp");

    await user.click(screen.getByRole("button", { name: "Remove photo" }));

    await waitFor(() => expect(usersClient.removeAvatar).toHaveBeenCalled());
    await waitFor(() => expect(setAvatarKey).toHaveBeenCalledWith(null));
  });

  it("hides the remove button when no avatar is set", () => {
    renderSection(null);
    expect(
      screen.queryByRole("button", { name: "Remove photo" }),
    ).not.toBeInTheDocument();
  });
});
