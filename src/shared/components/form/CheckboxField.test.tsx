import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
// #236: useFieldError now resolves catalog keys through next-intl, so any
// component rendering a field error needs the provider. renderWithIntl is
// aliased to `render` so the call sites below are unchanged.
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckboxField } from "./CheckboxField";

// Boolean-typed (not a literal) so the react-hook-form values type stays
// `{ accepted: boolean }`, matching how a real form registers the field.
const schema = z.object({
  accepted: z
    .boolean()
    .refine((v) => v === true, { message: "You must accept." }),
});
type Values = z.infer<typeof schema>;

function Harness({
  onValid,
  label,
}: {
  onValid: (v: Values) => void;
  label?: React.ReactNode;
}) {
  const methods = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { accepted: false },
  });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onValid)}>
        <CheckboxField name="accepted" label={label ?? "I accept"} />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

describe("CheckboxField", () => {
  it("renders a labelled checkbox wired through the form context", () => {
    render(<Harness onValid={vi.fn()} />);
    const box = screen.getByRole("checkbox", { name: "I accept" });
    expect(box).toBeInTheDocument();
    expect(box).not.toBeChecked();
  });

  it("submits the checked value through react-hook-form", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onValid).toHaveBeenCalledWith(
      expect.objectContaining({ accepted: true }),
      expect.anything(),
    );
  });

  it("shows the schema error inline and marks the box invalid on a bad submit", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("You must accept.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-describedby",
      "accepted-error",
    );
    expect(onValid).not.toHaveBeenCalled();
  });

  it("supports rich label content such as a link", () => {
    render(
      <Harness
        onValid={vi.fn()}
        label={
          <>
            I accept the <a href="/rules">rules</a>
          </>
        }
      />,
    );
    expect(screen.getByRole("link", { name: "rules" })).toHaveAttribute(
      "href",
      "/rules",
    );
  });
});

// CheckboxField deliberately does not reuse FormField (its label sits beside
// the box), so it renders its own error. That is exactly the kind of split
// where an icon lands in one and not the other — both go through FieldError.
describe("CheckboxField error rendering", () => {
  it("renders its error through FieldError, icon and all", async () => {
    render(<Harness onValid={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const alert = await screen.findByRole("alert");
    expect(alert.querySelector("svg")).toBeInTheDocument();
    expect(alert.querySelector("svg")).toHaveAttribute("aria-hidden");
  });
});
