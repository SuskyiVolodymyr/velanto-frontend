import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Select } from "./Select";

/**
 * Every form control must reach the DOM carrying an `id` or a `name`.
 *
 * Chrome's autofill heuristics warn on any field with neither ("A form field
 * element should have an id or name attribute"), and a control the browser
 * can't identify is also one a password manager can't fill and an automated
 * test can't select by anything but its label.
 *
 * Solved in the PRIMITIVES rather than at ~40 call sites: the identity is a
 * property of being a form control, not of any particular form. Callers that
 * pass a real `name` (React Hook Form's `register()` does) or an `id` paired
 * with a label keep theirs — the generated one is only ever a fallback, and a
 * meaningful name is always better than a generated id because it's what
 * autofill actually matches on.
 */
describe("form control identity", () => {
  const CASES = [
    ["Input", <Input key="i" aria-label="field" />],
    ["Textarea", <Textarea key="t" aria-label="field" />],
    ["Select", <Select key="s" aria-label="field" options={[]} />],
  ] as const;

  for (const [label, element] of CASES) {
    it(`${label} always reaches the DOM identifiable`, () => {
      render(element);
      const field = screen.getByLabelText("field");
      expect(field.id || field.getAttribute("name")).toBeTruthy();
    });

    it(`${label} does not override a caller's own name`, () => {
      const { container } = render(element);
      const generated = container.querySelector("input, textarea, select")!.id;

      render(
        <div data-testid="named">
          {label === "Input" ? (
            <Input aria-label="named" name="email" />
          ) : label === "Textarea" ? (
            <Textarea aria-label="named" name="bio" />
          ) : (
            <Select aria-label="named" name="role" options={[]} />
          )}
        </div>,
      );
      const field = screen.getByLabelText("named");
      expect(field.getAttribute("name")).toBe(
        label === "Input" ? "email" : label === "Textarea" ? "bio" : "role",
      );
      // A caller-supplied name is identity enough — don't also stamp an id on
      // it, or a `<label htmlFor>` elsewhere could bind to the wrong control.
      expect(field.id).toBe("");
      expect(generated).toBeTruthy();
    });

    it(`${label} does not override a caller's own id`, () => {
      render(
        label === "Input" ? (
          <Input aria-label="own-id" id="chosen" />
        ) : label === "Textarea" ? (
          <Textarea aria-label="own-id" id="chosen" />
        ) : (
          <Select aria-label="own-id" id="chosen" options={[]} />
        ),
      );
      expect(screen.getByLabelText("own-id").id).toBe("chosen");
    });
  }
});
