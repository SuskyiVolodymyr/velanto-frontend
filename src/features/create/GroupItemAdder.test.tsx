import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GroupItemAdder } from "./GroupItemAdder";

function renderAdder(
  overrides: Partial<React.ComponentProps<typeof GroupItemAdder>> = {},
) {
  const props = {
    index: 0,
    draftType: "image" as const,
    draftTitle: "",
    draftValue: "",
    validating: false,
    uploading: false,
    imagePreviewUrl: "",
    imageFile: null,
    addError: "",
    onSelectType: vi.fn(),
    onDraftTitleChange: vi.fn(),
    onDraftValueChange: vi.fn(),
    onSelectImage: vi.fn(),
    onApplyCrop: vi.fn(),
    onAdd: vi.fn(),
    ...overrides,
  };
  render(<GroupItemAdder {...props} />);
  return props;
}

describe("GroupItemAdder image input", () => {
  it("clears the file input value after a selection so re-picking the same file refires onChange", async () => {
    const { onSelectImage } = renderAdder();
    const user = userEvent.setup();
    const input = screen.getByLabelText("Pool 1 new image") as HTMLInputElement;

    await user.upload(input, new File(["x"], "pic.png", { type: "image/png" }));

    expect(onSelectImage).toHaveBeenCalledTimes(1);
    // The value is reset so selecting the identical file again still fires.
    expect(input.value).toBe("");
  });

  it("previews the image at 16:9 and offers an Adjust-crop control that opens the cropper", async () => {
    renderAdder({
      imagePreviewUrl: "https://cdn/pic.webp",
      imageFile: new File(["x"], "pic.png", { type: "image/png" }),
    });
    const user = userEvent.setup();

    // Preview container matches the play-time 16:9 framing (no square-vs-16:9
    // surprise). Empty-alt img isn't in the a11y tree, so select it directly.
    const img = document.querySelector<HTMLImageElement>(
      'img[src="https://cdn/pic.webp"]',
    );
    expect(img?.parentElement?.className).toContain("aspect-video");

    await user.click(screen.getByRole("button", { name: "Adjust crop" }));
    expect(screen.getByText("Adjust image crop")).toBeInTheDocument();
  });

  it("shows no Adjust-crop control before an image is picked", () => {
    renderAdder();
    expect(
      screen.queryByRole("button", { name: "Adjust crop" }),
    ).not.toBeInTheDocument();
  });
});
