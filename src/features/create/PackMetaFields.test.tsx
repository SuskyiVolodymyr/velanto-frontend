import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { FormProvider, useForm } from "react-hook-form";
import { PackMetaFields } from "./PackMetaFields";
import type { CreatePackValues } from "./create-pack.schema";
import type { PackTag } from "@/src/shared/types/pack";

function baseValues(tags: PackTag[] = []): CreatePackValues {
  return {
    title: "",
    description: "",
    coverTone: "#2b2a3a",
    language: "en",
    format: "save_one",
    tags,
    groups: [],
    rounds: [],
  };
}

function Harness({ tags }: { tags?: PackTag[] } = {}) {
  const methods = useForm<CreatePackValues>({
    defaultValues: baseValues(tags),
  });
  return (
    <FormProvider {...methods}>
      <PackMetaFields />
    </FormProvider>
  );
}

describe("PackMetaFields", () => {
  // Mock (Create Pack.dc.html): Title/Description/Tags/Cover sit inside one
  // bordered #171A22 card (border-radius:18px) — the same card treatment
  // every other section on this page already gets (format cards, pool
  // cards), not bare fields directly on the page background.
  it("wraps its fields in the section card matching the rest of the page", () => {
    render(<Harness />);

    const title = screen.getByLabelText("Title");
    const card = title.closest(".rounded-card");
    expect(card).not.toBeNull();
    expect(card).toHaveClass("border-border", "bg-surface-card");
  });

  // Mock: tag chips are a neutral pill (rgba(255,255,255,.07) bg, no border,
  // 99px radius) — not the accent-cyan "active filter" treatment, which this
  // app reserves for genuinely selected/active state elsewhere.
  it("renders tag chips as neutral pills, not accent-colored", () => {
    render(<Harness tags={["Anime"]} />);

    const chip = screen.getByRole("button", { name: /Remove Anime/i });
    expect(chip).toHaveClass("rounded-pill");
    expect(chip).not.toHaveClass("border-acc", "bg-acc/[0.14]", "text-acc");
  });

  // Mock: Tags (flex:1) and Cover (fixed 210px) sit side by side in one row,
  // not stacked as two independent full-width sections.
  it("lays Tags and Cover out side by side in one row", () => {
    render(<Harness />);

    const tagsLabel = screen.getByText("Tags");
    const coverLabel = screen.getByText("Cover image");
    const row = tagsLabel.closest(".flex-wrap");
    expect(row).not.toBeNull();
    expect(row).toContainElement(coverLabel);
  });
});
