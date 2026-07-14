import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { CoverCropModal } from "./CoverCropModal";
import { cropImage } from "@/src/shared/lib/crop-image";

// react-easy-crop is browser-only; stub it to report a fixed 4:3 crop area.
vi.mock("react-easy-crop", async () => {
  const React = await import("react");
  function CropperStub({
    onCropComplete,
  }: {
    onCropComplete: (a: unknown, pixels: unknown) => void;
  }) {
    React.useEffect(() => {
      onCropComplete({}, { x: 0, y: 0, width: 400, height: 300 });
    }, [onCropComplete]);
    return React.createElement("div", { "data-testid": "cropper" });
  }
  return { default: CropperStub };
});

vi.mock("@/src/shared/lib/crop-image", () => ({
  cropImage: vi.fn(),
  MAX_COVER_CROP: 1200,
}));

URL.createObjectURL = vi.fn(() => "blob:mock");
URL.revokeObjectURL = vi.fn();

const srcFile = () =>
  new File([new Uint8Array([1, 2, 3])], "pic.png", { type: "image/png" });

beforeEach(() => vi.clearAllMocks());

describe("CoverCropModal", () => {
  it("crops with the cover max dimension and returns the cropped File on Save", async () => {
    const cropped = new File([new Uint8Array([9])], "crop.webp", {
      type: "image/webp",
    });
    vi.mocked(cropImage).mockResolvedValue(cropped);
    const onCropped = vi.fn();
    const user = userEvent.setup();
    render(
      <CoverCropModal
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
        { x: 0, y: 0, width: 400, height: 300 },
        1200,
      ),
    );
    await waitFor(() => expect(onCropped).toHaveBeenCalledWith(cropped));
  });

  it("closes via Cancel without cropping", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <CoverCropModal
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
});
