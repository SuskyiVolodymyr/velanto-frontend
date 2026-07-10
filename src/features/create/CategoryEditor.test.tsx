import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
    render(
      <StatefulCategoryEditor initial={emptyCategory()} onChange={onChange} />,
    );

    await user.type(screen.getByLabelText("Category 1 name"), "Boys");

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "Boys" }),
    );
  });

  it("adds a text item to the category", async () => {
    const user = userEvent.setup();
    const category = emptyCategory();
    const onChange = vi.fn();
    render(
      <CategoryEditor category={category} index={0} onChange={onChange} />,
    );

    await user.type(screen.getByLabelText("Category 1 new item"), "Naruto");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            type: "text",
            title: "Naruto",
            value: "Naruto",
          }),
        ],
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
    render(
      <CategoryEditor category={category} index={0} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Remove Naruto" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ items: [] }),
    );
  });

  it("has no selectionMode or sampleSize controls (unlike GroupEditor)", () => {
    render(
      <CategoryEditor
        category={emptyCategory()}
        index={0}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Random" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Manual" }),
    ).not.toBeInTheDocument();
  });

  it("renders a validation error passed from the parent form", () => {
    render(
      <CategoryEditor
        category={emptyCategory()}
        index={0}
        onChange={vi.fn()}
        error='Category "Boys" needs at least one item.'
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      'Category "Boys" needs at least one item.',
    );
  });

  it("adds a youtube item after successful oEmbed validation, keeping a typed title", async () => {
    vi.mocked(fetchYouTubeOEmbed).mockResolvedValue({
      title: "Guren no Yumiya (Official)",
    });
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CategoryEditor
        category={emptyCategory()}
        index={0}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(
      screen.getByLabelText("Category 1 new item title"),
      "My title",
    );
    await user.type(
      screen.getByLabelText("Category 1 new item link"),
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
      <CategoryEditor
        category={emptyCategory()}
        index={0}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(
      screen.getByLabelText("Category 1 new item link"),
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
      <CategoryEditor
        category={emptyCategory()}
        index={0}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(
      screen.getByLabelText("Category 1 new item link"),
      "https://youtu.be/doesnotexist",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("Couldn't find that video — check the link."),
    ).toBeInTheDocument();
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
      <CategoryEditor
        category={emptyCategory()}
        index={0}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Link" }));
    const link = screen.getByLabelText("Category 1 new item link");
    await user.type(link, "https://youtu.be/KsF_hdjWJjo");

    // Two Enter keydowns back-to-back, with no await between them, to hit
    // the actual in-flight-validation race rather than the DOM's disabled
    // attribute (which user-event's own interaction guards would otherwise
    // mask by refusing to dispatch on a disabled element).
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

  it("rejects a non-YouTube-shaped link without calling oEmbed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CategoryEditor
        category={emptyCategory()}
        index={0}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Link" }));
    await user.type(
      screen.getByLabelText("Category 1 new item link"),
      "not a link",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("That doesn't look like a YouTube link."),
    ).toBeInTheDocument();
    expect(fetchYouTubeOEmbed).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
