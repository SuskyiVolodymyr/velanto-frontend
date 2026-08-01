import { useLayoutEffect, useRef } from "react";
import { render, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useHorizontalClamp } from "./use-horizontal-clamp";

// Stubs a panel's natural (unshifted) layout rect. `useHorizontalClamp`
// backs the current shift out of each measurement (rect.left/right already
// include it), so passing the SAME natural rect on every call is enough —
// the hook must still converge instead of compounding the shift.
function stubRect(el: HTMLElement, natural: { left: number; right: number }) {
  vi.spyOn(el, "getBoundingClientRect").mockImplementation(() => {
    const shift = Number(el.style.transform.match(/-?\d+(\.\d+)?/)?.[0] ?? 0);
    return {
      left: natural.left + shift,
      right: natural.right + shift,
      top: 0,
      bottom: 0,
      width: natural.right - natural.left,
      height: 0,
      x: natural.left + shift,
      y: 0,
      toJSON() {
        return this;
      },
    } as DOMRect;
  });
}

function Harness({
  natural,
  open,
}: {
  natural: { left: number; right: number };
  open: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Registered before useHorizontalClamp's own layout effect below, so it
  // runs first during commit (React fires a component's layout effects in
  // call order) and the hook measures an already-stubbed rect.
  useLayoutEffect(() => {
    if (ref.current) stubRect(ref.current, natural);
  }, [natural]);
  const style = useHorizontalClamp(ref, open);
  return (
    <div ref={ref} data-testid="panel" style={style}>
      panel
    </div>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  window.innerWidth = 1024;
});

describe("useHorizontalClamp", () => {
  it("applies no shift when the panel already fits on screen", () => {
    window.innerWidth = 1024;
    const { getByTestId } = render(
      <Harness natural={{ left: 400, right: 700 }} open={true} />,
    );
    act(() => {});
    expect(getByTestId("panel").style.transform).toBe("");
  });

  it("shifts right when the panel overflows the left edge", () => {
    window.innerWidth = 1024;
    const { getByTestId } = render(
      <Harness natural={{ left: -120, right: 180 }} open={true} />,
    );
    act(() => {});
    // left(-120) -> margin(16) needs +136
    expect(getByTestId("panel").style.transform).toBe("translateX(136px)");
  });

  it("shifts left when the panel overflows the right edge", () => {
    window.innerWidth = 400;
    const { getByTestId } = render(
      <Harness natural={{ left: 300, right: 500 }} open={true} />,
    );
    act(() => {});
    // right(500) -> (400 - 16 = 384) needs -116
    expect(getByTestId("panel").style.transform).toBe("translateX(-116px)");
  });

  it("resets the shift to nothing while closed", () => {
    window.innerWidth = 1024;
    const { getByTestId, rerender } = render(
      <Harness natural={{ left: -120, right: 180 }} open={true} />,
    );
    act(() => {});
    expect(getByTestId("panel").style.transform).toBe("translateX(136px)");
    rerender(<Harness natural={{ left: -120, right: 180 }} open={false} />);
    expect(getByTestId("panel").style.transform).toBe("");
  });
});
