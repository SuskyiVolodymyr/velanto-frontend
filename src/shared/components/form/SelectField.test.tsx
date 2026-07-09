import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SelectField } from "./SelectField";

const schema = z.object({
  locale: z.string().min(1, "Please choose a language."),
});
type Values = z.infer<typeof schema>;

const OPTIONS = [
  { value: "", label: "Choose a language…" },
  { value: "en", label: "English" },
  { value: "uk", label: "Ukrainian" },
];

function Harness({ onValid }: { onValid: (v: Values) => void }) {
  const methods = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { locale: "" },
  });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onValid)}>
        <SelectField name="locale" label="Language" options={OPTIONS} />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

describe("SelectField", () => {
  it("submits the chosen value through react-hook-form", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.selectOptions(screen.getByLabelText("Language"), "uk");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onValid).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "uk" }),
      expect.anything(),
    );
  });

  it("shows the schema error inline when left unset", async () => {
    const user = userEvent.setup();
    render(<Harness onValid={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Please choose a language.")).toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveAttribute("aria-invalid", "true");
  });
});
