import { describe, expect, it } from "vitest";
import {
  PAGE_CONTAINERS,
  pageContainer,
  type PageWidth,
} from "./page-container";

describe("pageContainer", () => {
  it("returns a centred, capped column for every supported width", () => {
    for (const width of Object.keys(PAGE_CONTAINERS).map(
      Number,
    ) as PageWidth[]) {
      const className = pageContainer(width);
      expect(className).toContain("mx-auto");
      expect(className).toContain("w-full");
      expect(className).toContain(`max-w-[${width}px]`);
    }
  });

  it("gives every width the mock's 30px gutter, narrowing on small screens", () => {
    for (const className of Object.values(PAGE_CONTAINERS)) {
      expect(className).toContain("px-[30px]");
      expect(className).toContain("max-[720px]:px-4");
    }
  });

  // Tailwind's JIT only emits a utility it can see spelled out in the source, so
  // a container built by interpolating the number (`max-w-[${w}px]`) would
  // produce a class with no CSS behind it and a silently full-bleed page. This
  // asserts the whole table is written out literally.
  it("spells every class out in full so Tailwind's JIT emits it", () => {
    expect(PAGE_CONTAINERS).toEqual({
      1320: "mx-auto w-full max-w-[1320px] px-[30px] max-[720px]:px-4",
      1240: "mx-auto w-full max-w-[1240px] px-[30px] max-[720px]:px-4",
      1180: "mx-auto w-full max-w-[1180px] px-[30px] max-[720px]:px-4",
      1120: "mx-auto w-full max-w-[1120px] px-[30px] max-[720px]:px-4",
      1100: "mx-auto w-full max-w-[1100px] px-[30px] max-[720px]:px-4",
      1040: "mx-auto w-full max-w-[1040px] px-[30px] max-[720px]:px-4",
      720: "mx-auto w-full max-w-[720px] px-[30px] max-[720px]:px-4",
      680: "mx-auto w-full max-w-[680px] px-[30px] max-[720px]:px-4",
    });
  });
});
