import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { GroupItemAdder } from "./GroupItemAdder";

function renderAdder(onSelectImage = vi.fn()) {
  render(
    <GroupItemAdder
      index={0}
      draftType="image"
      draftTitle=""
      draftValue=""
      validating={false}
      uploading={false}
      imagePreviewUrl=""
      addError=""
      onSelectType={vi.fn()}
      onDraftTitleChange={vi.fn()}
      onDraftValueChange={vi.fn()}
      onSelectImage={onSelectImage}
      onAdd={vi.fn()}
    />,
  );
  return onSelectImage;
}

describe("GroupItemAdder image input", () => {
  it("clears the file input value after a selection so re-picking the same file refires onChange", async () => {
    const onSelectImage = renderAdder();
    const user = userEvent.setup();
    const input = screen.getByLabelText("Pool 1 new image") as HTMLInputElement;

    await user.upload(input, new File(["x"], "pic.png", { type: "image/png" }));

    expect(onSelectImage).toHaveBeenCalledTimes(1);
    // The value is reset so selecting the identical file again still fires.
    expect(input.value).toBe("");
  });
});
