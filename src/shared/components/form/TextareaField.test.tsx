import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextareaField } from "./TextareaField";

const schema = z.object({
  body: z.string().min(1, "Details are required."),
});
type Values = z.infer<typeof schema>;

function Harness({ onValid }: { onValid: (v: Values) => void }) {
  const methods = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { body: "" },
  });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onValid)}>
        <TextareaField name="body" label="Details" placeholder="Details" />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

describe("TextareaField", () => {
  it("submits the typed value through react-hook-form", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.type(screen.getByLabelText("Details"), "some detail");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onValid).toHaveBeenCalledWith(
      expect.objectContaining({ body: "some detail" }),
      expect.anything(),
    );
  });

  it("shows the schema error inline on a bad submit", async () => {
    const user = userEvent.setup();
    render(<Harness onValid={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Details are required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Details")).toHaveAttribute("aria-invalid", "true");
  });
});
