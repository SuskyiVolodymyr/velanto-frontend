import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { GroupEditor } from "./GroupEditor";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";
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

function emptyGroup(): Group {
  return { id: "g1", name: "", items: [] };
}

beforeEach(() => {
  vi.mocked(fetchYouTubeOEmbed).mockReset();
});

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

    await user.click(screen.getByRole("button", { name: "Link" }));
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

    await user.click(screen.getByRole("button", { name: "Link" }));
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

    await user.click(screen.getByRole("button", { name: "Link" }));
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

    await user.click(screen.getByRole("button", { name: "Link" }));
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

    await user.click(screen.getByRole("button", { name: "Link" }));
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
