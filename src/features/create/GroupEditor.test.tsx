import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupEditor } from "./GroupEditor";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";
import type { Group } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/youtube-oembed", () => ({
  fetchYouTubeOEmbed: vi.fn(),
}));

function emptyGroup(): Group {
  return { id: "g1", name: "", selectionMode: "manual", items: [] };
}

beforeEach(() => {
  vi.mocked(fetchYouTubeOEmbed).mockReset();
});

describe("GroupEditor", () => {
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
    await user.type(
      screen.getByLabelText("Group 1 new item title"),
      "My title",
    );
    await user.type(
      screen.getByLabelText("Group 1 new item link"),
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

  it("falls back to the oEmbed video title when no title was typed", async () => {
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
    await user.type(
      screen.getByLabelText("Group 1 new item link"),
      "https://youtu.be/KsF_hdjWJjo",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({ title: "Guren no Yumiya (Official)" }),
          ],
        }),
      ),
    );
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
    await user.type(
      screen.getByLabelText("Group 1 new item link"),
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
      screen.getByLabelText("Group 1 new item link"),
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
    const link = screen.getByLabelText("Group 1 new item link");
    await user.type(link, "https://youtu.be/KsF_hdjWJjo");

    fireEvent.keyDown(link, { key: "Enter" });
    fireEvent.keyDown(link, { key: "Enter" });

    expect(fetchYouTubeOEmbed).toHaveBeenCalledTimes(1);

    resolveOEmbed({ title: "Guren no Yumiya (Official)" });
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ title: "Guren no Yumiya (Official)" }),
        ],
      }),
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

  it("disables the selection-mode and sample-size controls while validation is in flight", async () => {
    vi.mocked(fetchYouTubeOEmbed).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    const group: Group = {
      id: "g1",
      name: "",
      selectionMode: "random",
      sampleSize: 3,
      items: [],
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

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(
      screen.getByLabelText("Group 1 new item link"),
      "https://youtu.be/KsF_hdjWJjo",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("button", { name: "Random" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Manual" })).toBeDisabled();
    expect(screen.getByLabelText("Group 1 sample size")).toBeDisabled();
  });
});
