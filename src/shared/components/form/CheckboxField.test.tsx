import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
