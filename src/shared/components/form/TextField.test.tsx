import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField } from "./TextField";

const schema = z.object({
  email: z.string().min(1, "Email is required."),
});
type Values = z.infer<typeof schema>;

function Harness({
  onValid,
  describedBy,
}: {
  onValid: (v: Values) => void;
  describedBy?: string;
}) {
  const methods = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onValid)}>
        <TextField name="email" label="Email" placeholder="Email" aria-describedby={describedBy} />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

describe("TextField", () => {
  it("renders a labelled input wired through the form context", () => {
    render(<Harness onValid={vi.fn()} />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("submits the typed value through react-hook-form", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.type(screen.getByLabelText("Email"), "a@example.com");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onValid).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@example.com" }),
      expect.anything(),
    );
  });

  it("shows the schema error inline and marks the input invalid on a bad submit", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-describedby", "email-error");
    expect(onValid).not.toHaveBeenCalled();
  });

  it("merges the error id with a caller-supplied aria-describedby hint", async () => {
    const user = userEvent.setup();
    render(<Harness onValid={vi.fn()} describedBy="email-hint" />);

    // Hint alone before any error.
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-describedby", "email-hint");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("Email is required.");
    // Error id and the caller hint coexist, error first.
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-describedby",
      "email-error email-hint",
    );
  });
});
