import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryEditor } from "./CategoryEditor";
import { fetchYouTubeOEmbed } from "@/src/shared/lib/youtube-oembed";
import type { Category } from "@/src/shared/types/pack";

vi.mock("@/src/shared/lib/youtube-oembed", () => ({
  fetchYouTubeOEmbed: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(fetchYouTubeOEmbed).mockReset();
});

function emptyCategory(): Category {
  return { id: "ca", name: "", items: [] };
}

function StatefulCategoryEditor({
  initial,
  onChange,
}: {
  initial: Category;
  onChange: (category: Category) => void;
}) {
  const [category, setCategory] = useState(initial);
  return (
    <CategoryEditor
      category={category}
      index={0}
      onChange={(next) => {
        setCategory(next);
        onChange(next);
      }}
    />
  );
}

describe("CategoryEditor", () => {
  it("renames the category via onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulCategoryEditor initial={emptyCategory()} onChange={onChange} />);

    await user.type(screen.getByLabelText("Category 1 name"), "Boys");

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Boys" }));
  });

  it("adds a text item to the category", async () => {
    const user = userEvent.setup();
    const category = emptyCategory();
    const onChange = vi.fn();
    render(<CategoryEditor category={category} index={0} onChange={onChange} />);

    await user.type(screen.getByLabelText("Category 1 new item"), "Naruto");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ type: "text", title: "Naruto", value: "Naruto" })],
      }),
    );
  });

  it("removes an item from the category", async () => {
    const user = userEvent.setup();
    const category: Category = {
      id: "ca",
      name: "Boys",
      items: [{ id: "i1", type: "text", title: "Naruto", value: "Naruto" }],
    };
    const onChange = vi.fn();
    render(<CategoryEditor category={category} index={0} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Remove Naruto" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ items: [] }));
  });

  it("has no selectionMode or sampleSize controls (unlike GroupEditor)", () => {
    render(<CategoryEditor category={emptyCategory()} index={0} onChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Random" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manual" })).not.toBeInTheDocument();
  });

  it("adds a youtube item after successful oEmbed validation, keeping a typed title", async () => {
    vi.mocked(fetchYouTubeOEmbed).mockResolvedValue({ title: "Guren no Yumiya (Official)" });
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryEditor category={emptyCategory()} index={0} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByLabelText("Category 1 new item title"), "My title");
    await user.type(screen.getByLabelText("Category 1 new item link"), "https://youtu.be/KsF_hdjWJjo");
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
    vi.mocked(fetchYouTubeOEmbed).mockResolvedValue({ title: "Guren no Yumiya (Official)" });
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryEditor category={emptyCategory()} index={0} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByLabelText("Category 1 new item link"), "https://youtu.be/KsF_hdjWJjo");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ title: "Guren no Yumiya (Official)" })],
        }),
      ),
    );
  });

  it("shows an error and does not add when the video can't be found", async () => {
    vi.mocked(fetchYouTubeOEmbed).mockResolvedValue(null);
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryEditor category={emptyCategory()} index={0} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByLabelText("Category 1 new item link"), "https://youtu.be/doesnotexist");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Couldn't find that video — check the link.")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects a non-YouTube-shaped link without calling oEmbed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryEditor category={emptyCategory()} index={0} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(screen.getByLabelText("Category 1 new item link"), "not a link");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("That doesn't look like a YouTube link.")).toBeInTheDocument();
    expect(fetchYouTubeOEmbed).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
