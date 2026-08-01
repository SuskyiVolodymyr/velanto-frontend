import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { GroupEditor } from "./GroupEditor";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";
import { uploadMedia } from "@/src/shared/lib/media-client";
import type { Group } from "@/src/shared/types/pack";

// GroupEditor's name input is controlled by the `group` prop, so a rename only
// sticks when the parent feeds the updated value back — this wrapper mirrors how
// PoolsSection re-renders the editor with each change.
function StatefulGroupEditor({
  initial,
  onChange,
}: {
  initial: Group;
  onChange: (group: Group) => void;
}) {
  const [group, setGroup] = useState(initial);
  return (
    <GroupEditor
      group={group}
      index={0}
      removable={false}
      onChange={(next) => {
        setGroup(next);
        onChange(next);
      }}
      onRemove={vi.fn()}
    />
  );
}

vi.mock("@/src/shared/lib/youtube-oembed", () => ({
  fetchYouTubeOEmbed: vi.fn(),
}));

vi.mock("@/src/shared/lib/media-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/src/shared/lib/media-client")>();
  return { ...actual, uploadMedia: vi.fn() };
});

function emptyGroup(): Group {
  return { id: "g1", name: "", items: [] };
}

beforeEach(() => {
  vi.mocked(fetchYouTubeOEmbed).mockReset();
  vi.mocked(uploadMedia).mockReset();
});

function imageFile(name = "poster.png", type = "image/png", size = 1000) {
  const file = new File(["x"], name, { type });
  // File.size is read-only; jsdom derives it from the blob parts, so override it
  // to exercise the client-side size cap without allocating a real 1MB+ buffer.
  Object.defineProperty(file, "size", { value: size });
  return file;
}

// T5: items are read-only chips by default now — adding requires expanding
// the dashed "+ Add item" trigger into its panel first.
async function openAdder(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "+ Add item" }));
}

describe("GroupEditor (pool)", () => {
  it("has no selection-mode or sample-size controls (those moved to rounds)", () => {
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Random" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Manual" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Pool 1 sample size"),
    ).not.toBeInTheDocument();
  });

  it("renames the pool via onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulGroupEditor initial={emptyGroup()} onChange={onChange} />);

    await user.type(screen.getByLabelText("Pool 1 name"), "Openings");

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "Openings" }),
    );
  });

  it("adds a youtube item after successful oEmbed validation, keeping a typed title", async () => {
    vi.mocked(fetchYouTubeOEmbed).mockResolvedValue({
      title: "Guren no Yumiya (Official)",
    });
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    await user.click(
      screen.getByRole("radio", { name: "Pool 1 item type: YouTube" }),
    );
    await user.type(screen.getByLabelText("Pool 1 new item title"), "My title");
    await user.type(
      screen.getByLabelText("Pool 1 new item link"),
      "https://youtu.be/KsF_hdjWJjo",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              type: "youtube",
              title: "My title",
              value: "https://youtu.be/KsF_hdjWJjo",
            }),
          ],
        }),
      ),
    );
  });

  it("requires a title for a link item, erroring (without calling oEmbed) when none is typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    await user.click(
      screen.getByRole("radio", { name: "Pool 1 item type: YouTube" }),
    );
    await user.type(
      screen.getByLabelText("Pool 1 new item link"),
      "https://youtu.be/KsF_hdjWJjo",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("Add a title for this link."),
    ).toBeInTheDocument();
    expect(fetchYouTubeOEmbed).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows an error and does not add when the video can't be found", async () => {
    vi.mocked(fetchYouTubeOEmbed).mockResolvedValue(null);
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    await user.click(
      screen.getByRole("radio", { name: "Pool 1 item type: YouTube" }),
    );
    await user.type(screen.getByLabelText("Pool 1 new item title"), "My title");
    await user.type(
      screen.getByLabelText("Pool 1 new item link"),
      "https://youtu.be/doesnotexist",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("Couldn't find that video — check the link."),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects a non-YouTube-shaped link without calling oEmbed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    await user.click(
      screen.getByRole("radio", { name: "Pool 1 item type: YouTube" }),
    );
    await user.type(
      screen.getByLabelText("Pool 1 new item link"),
      "not a link",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("That doesn't look like a YouTube link."),
    ).toBeInTheDocument();
    expect(fetchYouTubeOEmbed).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores a second Enter fired while validation is still in flight, adding only one item", async () => {
    let resolveOEmbed!: (value: { title: string } | null) => void;
    vi.mocked(fetchYouTubeOEmbed).mockReturnValue(
      new Promise((resolve) => {
        resolveOEmbed = resolve;
      }),
    );
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    await user.click(
      screen.getByRole("radio", { name: "Pool 1 item type: YouTube" }),
    );
    await user.type(screen.getByLabelText("Pool 1 new item title"), "My title");
    const link = screen.getByLabelText("Pool 1 new item link");
    await user.type(link, "https://youtu.be/KsF_hdjWJjo");

    fireEvent.keyDown(link, { key: "Enter" });
    fireEvent.keyDown(link, { key: "Enter" });

    expect(fetchYouTubeOEmbed).toHaveBeenCalledTimes(1);

    resolveOEmbed({ title: "Guren no Yumiya (Official)" });
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ title: "My title" })],
      }),
    );
  });

  it("removes an item from the pool", async () => {
    const user = userEvent.setup();
    const group: Group = {
      id: "g1",
      name: "Openings",
      items: [{ id: "i1", type: "text", title: "Naruto", value: "Naruto" }],
    };
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={group}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove Naruto" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ items: [] }),
    );
  });

  it("renders a validation error passed from the parent form", () => {
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        error='Group "R1" needs at least one item.'
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      'Group "R1" needs at least one item.',
    );
  });

  it("uploads a picked image, previews it, and adds an item storing the returned key", async () => {
    vi.mocked(uploadMedia).mockResolvedValue({
      key: "media/item/abc.webp",
      url: "https://cdn.example.com/media/item/abc.webp",
      byteSize: 900,
    });
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    await user.click(
      screen.getByRole("radio", { name: "Pool 1 item type: Image" }),
    );
    await user.type(
      screen.getByLabelText("Pool 1 new item title"),
      "Attack on Titan",
    );
    await user.upload(screen.getByLabelText("Pool 1 new image"), imageFile());

    // Preview appears once the upload resolves (empty alt — decorative next to
    // the title field).
    await waitFor(() =>
      expect(
        document.querySelector(
          'img[src="https://cdn.example.com/media/item/abc.webp"]',
        ),
      ).toBeInTheDocument(),
    );
    expect(uploadMedia).toHaveBeenCalledWith(expect.any(File), "item");

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            type: "image",
            title: "Attack on Titan",
            value: "media/item/abc.webp",
          }),
        ],
      }),
    );
  });

  it("rejects a non-image file without uploading", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    await user.click(
      screen.getByRole("radio", { name: "Pool 1 item type: Image" }),
    );
    // fireEvent.change (not userEvent.upload) so the non-image file bypasses the
    // input's accept="image/*" pre-filter — we're asserting the component's OWN
    // type guard, not the browser's.
    fireEvent.change(screen.getByLabelText("Pool 1 new image"), {
      target: { files: [imageFile("notes.txt", "text/plain")] },
    });

    expect(
      await screen.findByText("Choose an image file."),
    ).toBeInTheDocument();
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("rejects an image over 1MB without uploading", async () => {
    const user = userEvent.setup();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    await user.click(
      screen.getByRole("radio", { name: "Pool 1 item type: Image" }),
    );
    await user.upload(
      screen.getByLabelText("Pool 1 new image"),
      imageFile("huge.png", "image/png", 1024 * 1024 + 1),
    );

    expect(
      await screen.findByText("Image must be 1 MB or smaller."),
    ).toBeInTheDocument();
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("requires a title before an uploaded image can be added", async () => {
    vi.mocked(uploadMedia).mockResolvedValue({
      key: "media/item/abc.webp",
      url: "https://cdn.example.com/media/item/abc.webp",
      byteSize: 900,
    });
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    await user.click(
      screen.getByRole("radio", { name: "Pool 1 item type: Image" }),
    );
    await user.upload(screen.getByLabelText("Pool 1 new image"), imageFile());
    await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("Add a title for this image."),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows an error when the upload fails", async () => {
    vi.mocked(uploadMedia).mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    await user.click(
      screen.getByRole("radio", { name: "Pool 1 item type: Image" }),
    );
    await user.upload(screen.getByLabelText("Pool 1 new image"), imageFile());

    expect(
      await screen.findByText("Upload failed. Try again."),
    ).toBeInTheDocument();
  });

  it("calls onRemove from the remove control when removable", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={true}
        onChange={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove pool 1" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

// The T7 restyle (2.0.0) changes the remove-pool control to a 34x34 icon
// button and the type toggle from hand-rolled aria-pressed buttons to the
// shared SegmentedControl, and re-skins the commit button — none of that may
// change these three accessible names, since e2e/create-pack.spec.ts resolves
// controls by them (the remove-pool aria-label via `create.removeGroup`, the
// commit button via exact name "Add", and "New pool" — the latter rendered
// by PoolsSection, covered instead by CreatePackForm.test.tsx).
describe("GroupEditor restyle — accessible names stay stable", () => {
  it("keeps the remove-pool aria-label exactly as create.removeGroup renders it", () => {
    render(
      <GroupEditor
        group={emptyGroup()}
        index={2}
        removable={true}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remove pool 3" }),
    ).toBeInTheDocument();
  });

  it("keeps the commit button's accessible name exactly 'Add' (not editing)", async () => {
    const user = userEvent.setup();
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);

    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});

// Clicking a chip lifts that item back into the form row so it can be corrected
// in place, rather than forcing a delete-and-retype.
describe("GroupEditor editing an added item", () => {
  function withItems(): Group {
    return {
      id: "g1",
      name: "Pool",
      items: [
        { id: "i1", type: "text", title: "Alpha", value: "Alpha" },
        { id: "i2", type: "text", title: "Beta", value: "Beta" },
      ],
    };
  }

  it("loads the clicked item into the input and renames the action to Save", async () => {
    const user = userEvent.setup();
    render(<StatefulGroupEditor initial={withItems()} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Edit Alpha" }));

    expect(screen.getByLabelText("Pool 1 new item")).toHaveValue("Alpha");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add" }),
    ).not.toBeInTheDocument();
  });

  // Save/cancel semantics of the edit itself (replace-in-place, return to Add,
  // refuse an emptied item, cancel leaves the item untouched, text→title carry)
  // are owned by use-group-item-draft.test — only the DOM wiring lives here.
  it("cancels with Escape", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulGroupEditor initial={withItems()} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Edit Alpha" }));
    await user.type(screen.getByLabelText("Pool 1 new item"), "{Escape}");

    // The inline edit panel collapses back to the dashed trigger — not to a
    // visible "Add" panel (T5: nothing is docked open by default).
    expect(
      await screen.findByRole("button", { name: "+ Add item" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Pool 1 new item")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  // Removing the item being edited must not leave the row bound to a ghost.
  it("drops out of edit mode when the edited item is removed", async () => {
    const user = userEvent.setup();
    render(<StatefulGroupEditor initial={withItems()} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Edit Alpha" }));
    await user.click(screen.getByRole("button", { name: "Remove Alpha" }));

    expect(
      await screen.findByRole("button", { name: "+ Add item" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Pool 1 new item")).not.toBeInTheDocument();
  });
});

// T7 restyle: item chips gain a 30x22 thumbnail slot for youtube/image items,
// and an empty pool now shows the shared EmptyState placeholder instead of
// rendering nothing.
describe("GroupEditor restyle — chip thumbnails and empty state", () => {
  it("shows the shared EmptyState placeholder when a pool has no items", () => {
    render(
      <GroupEditor
        group={emptyGroup()}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No elements yet — add your first above."),
    ).toBeInTheDocument();
  });

  it("renders an image thumbnail before an image item's label", () => {
    const group: Group = {
      id: "g1",
      name: "Pool",
      items: [
        {
          id: "i1",
          type: "image",
          title: "Cover",
          value: "media/item/abc.webp",
        },
      ],
    };
    render(
      <GroupEditor
        group={group}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const img = document.querySelector<HTMLImageElement>('img[alt=""]');
    expect(img?.src).toContain("media/item/abc.webp");
  });

  it("renders a play-triangle overlay on a youtube item's thumbnail", () => {
    const group: Group = {
      id: "g1",
      name: "Pool",
      items: [
        {
          id: "i1",
          type: "youtube",
          title: "Opening",
          value: "https://youtu.be/KsF_hdjWJjo",
        },
      ],
    };
    render(
      <GroupEditor
        group={group}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const editButton = screen.getByRole("button", { name: "Edit Opening" });
    expect(editButton.querySelector(".border-l-white")).toBeInTheDocument();
  });

  it("renders no thumbnail slot for a text item", () => {
    const group: Group = {
      id: "g1",
      name: "Pool",
      items: [{ id: "i1", type: "text", title: "Naruto", value: "Naruto" }],
    };
    render(
      <GroupEditor
        group={group}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const editButton = screen.getByRole("button", { name: "Edit Naruto" });
    expect(editButton.querySelector("img")).not.toBeInTheDocument();
  });
});

// T5: items are plain read-only chips by default; adding/editing requires
// expanding an inline panel rather than a form permanently docked below the
// chip list.
describe("GroupEditor progressive disclosure (T5)", () => {
  function withItems(): Group {
    return {
      id: "g1",
      name: "Pool",
      items: [
        { id: "i1", type: "text", title: "Alpha", value: "Alpha" },
        { id: "i2", type: "text", title: "Beta", value: "Beta" },
      ],
    };
  }

  it("shows only the dashed trigger, no add fields, until it's clicked", () => {
    render(
      <GroupEditor
        group={withItems()}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "+ Add item" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Pool 1 new item")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add" }),
    ).not.toBeInTheDocument();
  });

  it("expands the add panel on click and collapses it back on Cancel", async () => {
    const user = userEvent.setup();
    render(
      <GroupEditor
        group={withItems()}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    expect(screen.getByLabelText("Pool 1 new item")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "+ Add item" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.getByRole("button", { name: "+ Add item" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Pool 1 new item")).not.toBeInTheDocument();
  });

  it("collapses the add panel back to the trigger after a successful add", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulGroupEditor initial={withItems()} onChange={onChange} />);

    await openAdder(user);
    await user.type(screen.getByLabelText("Pool 1 new item"), "Gamma");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onChange).toHaveBeenCalled();
    expect(
      await screen.findByRole("button", { name: "+ Add item" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Pool 1 new item")).not.toBeInTheDocument();
  });

  it("keeps the add panel open with its error when the add is rejected", async () => {
    const user = userEvent.setup();
    render(
      <GroupEditor
        group={withItems()}
        index={0}
        removable={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await openAdder(user);
    await user.click(
      screen.getByRole("radio", { name: "Pool 1 item type: YouTube" }),
    );
    await user.type(
      screen.getByLabelText("Pool 1 new item link"),
      "not a link",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("That doesn't look like a YouTube link."),
    ).toBeInTheDocument();
    // Still expanded — a validation failure must not silently collapse the
    // panel and lose what the author typed.
    expect(
      screen.queryByRole("button", { name: "+ Add item" }),
    ).not.toBeInTheDocument();
  });

  it("expands a chip's edit panel inline, anchored right after that chip, with Save/Cancel/Delete", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulGroupEditor initial={withItems()} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Edit Alpha" }));

    expect(screen.getByLabelText("Pool 1 new item")).toHaveValue("Alpha");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    // "Remove" doubles as the edit panel's Delete action (T5) — it deletes
    // the item being edited outright, distinct from Cancel (which discards
    // only the in-progress edit).
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    // The dashed "+ Add item" trigger is hidden while a chip is expanded —
    // only one panel is open at a time.
    expect(
      screen.queryByRole("button", { name: "+ Add item" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ title: "Beta" })],
      }),
    );
    expect(
      await screen.findByRole("button", { name: "+ Add item" }),
    ).toBeInTheDocument();
  });

  it("switches straight from editing one chip to another without closing first", async () => {
    const user = userEvent.setup();
    render(<StatefulGroupEditor initial={withItems()} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Edit Alpha" }));
    expect(screen.getByLabelText("Pool 1 new item")).toHaveValue("Alpha");

    await user.click(screen.getByRole("button", { name: "Edit Beta" }));

    expect(screen.getByLabelText("Pool 1 new item")).toHaveValue("Beta");
    // Only one edit panel exists at a time.
    expect(screen.getAllByRole("button", { name: "Save" })).toHaveLength(1);
  });
});
