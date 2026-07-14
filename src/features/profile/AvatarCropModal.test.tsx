import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { AvatarCropModal } from "./AvatarCropModal";
import { cropImage } from "@/src/shared/lib/crop-image";

// react-easy-crop is browser-only (measures DOM, drags). Stub it to report a
// fixed crop area via an effect (not during render) so Save is enabled without a
// real cropper.
vi.mock("react-easy-crop", async () => {
  const React = await import("react");
  function CropperStub({
    onCropComplete,
  }: {
    onCropComplete: (a: unknown, pixels: unknown) => void;
  }) {
    React.useEffect(() => {
      onCropComplete({}, { x: 5, y: 5, width: 200, height: 200 });
    }, [onCropComplete]);
    return React.createElement("div", { "data-testid": "cropper" });
  }
  return { default: CropperStub };
});

vi.mock("@/src/shared/lib/crop-image", () => ({
  cropImage: vi.fn(),
  MAX_AVATAR_CROP: 512,
}));

// jsdom has no object-URL support; the modal previews the file via one.
URL.createObjectURL = vi.fn(() => "blob:mock");
URL.revokeObjectURL = vi.fn();

const srcFile = () =>
  new File([new Uint8Array([1, 2, 3])], "pic.png", { type: "image/png" });

beforeEach(() => vi.clearAllMocks());

describe("AvatarCropModal", () => {
  it("crops the picked file and returns the cropped File on Save", async () => {
    const cropped = new File([new Uint8Array([9])], "avatar.webp", {
      type: "image/webp",
    });
    vi.mocked(cropImage).mockResolvedValue(cropped);
    const onCropped = vi.fn();
    const user = userEvent.setup();
    render(
      <AvatarCropModal
        file={srcFile()}
        open
        onCancel={vi.fn()}
        onCropped={onCropped}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(cropImage).toHaveBeenCalledWith(
        expect.any(File),
        { x: 5, y: 5, width: 200, height: 200 },
        512,
      ),
    );
    await waitFor(() => expect(onCropped).toHaveBeenCalledWith(cropped));
  });

  it("closes via Cancel without cropping", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <AvatarCropModal
        file={srcFile()}
        open
        onCancel={onCancel}
        onCropped={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(cropImage).not.toHaveBeenCalled();
  });

  it("blocks dismissal while a crop is encoding, then completes", async () => {
    let resolveCrop!: (f: File) => void;
    vi.mocked(cropImage).mockReturnValue(
      new Promise((res) => {
        resolveCrop = res;
      }),
    );
    const onCancel = vi.fn();
    const onCropped = vi.fn();
    const user = userEvent.setup();
    render(
      <AvatarCropModal
        file={srcFile()}
        open
        onCancel={onCancel}
        onCropped={onCropped}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    // Crop is in flight (busy) — Escape must not cancel it out from under us.
    await user.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();

    const cropped = new File([new Uint8Array([9])], "avatar.webp", {
      type: "image/webp",
    });
    resolveCrop(cropped);
    await waitFor(() => expect(onCropped).toHaveBeenCalledWith(cropped));
  });

  it("surfaces a crop failure without calling onCropped", async () => {
    vi.mocked(cropImage).mockRejectedValue(new Error("canvas"));
    const onCropped = vi.fn();
    const user = userEvent.setup();
    render(
      <AvatarCropModal
        file={srcFile()}
        open
        onCancel={vi.fn()}
        onCropped={onCropped}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Couldn't crop the image. Try again."),
    ).toBeInTheDocument();
    expect(onCropped).not.toHaveBeenCalled();
  });
});
