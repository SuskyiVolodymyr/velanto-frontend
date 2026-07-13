import { describe, expect, it, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { CandidateCard } from "./CandidateCard";
import type { Item } from "@/src/shared/types/pack";

afterEach(() => {
  vi.unstubAllEnvs();
});

function imageItem(id: string, title: string, key: string): Item {
  return { id, type: "image", title, value: key };
}

describe("CandidateCard (image item)", () => {
  it("renders the image with the title as alt, resolved from the stored key", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://cdn.example.com");
    render(
      <CandidateCard
        item={imageItem("1", "Naruto", "media/item/naruto.webp")}
        index={0}
        selected={false}
        onSelect={vi.fn()}
      />,
    );

    const img = screen.getByRole("img", { name: "Naruto" });
    expect(img).toHaveAttribute(
      "src",
      "https://cdn.example.com/media/item/naruto.webp",
    );
  });

  it("selects the item when the card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CandidateCard
        item={imageItem("1", "Naruto", "media/item/naruto.webp")}
        index={0}
        selected={false}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pick Naruto" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
