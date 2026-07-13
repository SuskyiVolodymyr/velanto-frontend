import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ImageCard } from "./ImageCard";

describe("ImageCard", () => {
  it("renders the image with the given src and meaningful alt text", () => {
    render(
      <ImageCard
        src="https://cdn.example.com/media/item/a.webp"
        alt="Naruto"
      />,
    );

    const img = screen.getByRole("img", { name: "Naruto" });
    expect(img).toHaveAttribute(
      "src",
      "https://cdn.example.com/media/item/a.webp",
    );
  });
});
