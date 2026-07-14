import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { CoverImageField } from "./CoverImageField";
import { uploadMedia, MEDIA_MAX_BYTES } from "@/src/shared/lib/media-client";
import type { CreatePackValues } from "@/src/features/create/create-pack.schema";

vi.mock("@/src/shared/lib/media-client", () => ({
  uploadMedia: vi.fn(),
  MEDIA_MAX_BYTES: 1024 * 1024,
}));

function Harness({ initialKey }: { initialKey?: string } = {}) {
  const methods = useForm<CreatePackValues>({
    defaultValues: { coverImageKey: initialKey } as CreatePackValues,
  });
  return (
    <FormProvider {...methods}>
      <CoverImageField />
    </FormProvider>
  );
}

const pngFile = () =>
  new File([new Uint8Array([1, 2, 3])], "cover.png", { type: "image/png" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CoverImageField", () => {
  it("shows the upload control and hint, with no preview or remove when empty", () => {
    render(<Harness />);

    expect(screen.getByText("Choose image")).toBeInTheDocument();
    expect(
      screen.getByText("PNG or JPG, up to 1 MB. Shown instead of the tone."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove cover image" }),
    ).not.toBeInTheDocument();
  });

  it("uploads a picked image as a cover and previews the returned key", async () => {
    vi.mocked(uploadMedia).mockResolvedValue({
      key: "media/cover/new.webp",
      url: "https://cdn.example.com/media/cover/new.webp",
      byteSize: 100,
    });
    const user = userEvent.setup();
    const { container } = render(<Harness />);

    await user.upload(screen.getByLabelText("Cover image"), pngFile());

    await waitFor(() =>
      expect(uploadMedia).toHaveBeenCalledWith(expect.any(File), "cover"),
    );
    await waitFor(() => {
      const img = container.querySelector("img");
      expect(img?.getAttribute("src")).toContain("media/cover/new.webp");
    });
    expect(
      screen.getByRole("button", { name: "Remove cover image" }),
    ).toBeInTheDocument();
  });

  it("removes the cover, clearing the preview back to the gradient", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initialKey="media/cover/old.webp" />);

    expect(container.querySelector("img")).not.toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Remove cover image" }),
    );

    expect(container.querySelector("img")).toBeNull();
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("rejects a non-image file without uploading", async () => {
    render(<Harness />);

    // fireEvent (not userEvent.upload) so the accept="image/*" filter doesn't
    // drop the file before onChange — this exercises the client-side guard.
    fireEvent.change(screen.getByLabelText("Cover image"), {
      target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] },
    });

    expect(
      await screen.findByText("Choose an image file."),
    ).toBeInTheDocument();
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("rejects an image larger than the size cap without uploading", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const big = new File([new Uint8Array(MEDIA_MAX_BYTES + 1)], "big.png", {
      type: "image/png",
    });
    await user.upload(screen.getByLabelText("Cover image"), big);

    expect(
      await screen.findByText("Image must be 1 MB or smaller."),
    ).toBeInTheDocument();
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("surfaces an upload failure and keeps no cover set", async () => {
    vi.mocked(uploadMedia).mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    const { container } = render(<Harness />);

    await user.upload(screen.getByLabelText("Cover image"), pngFile());

    expect(
      await screen.findByText("Upload failed. Try again."),
    ).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
