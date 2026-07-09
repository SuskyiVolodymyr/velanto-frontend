import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { SegmentedField } from "./SegmentedField";

type Topic = "bug" | "feature";
interface Values {
  topic: Topic;
}

const OPTIONS = [
  { value: "bug" as const, label: "Bug" },
  { value: "feature" as const, label: "Feature" },
];

function Harness({ onValid }: { onValid: (v: Values) => void }) {
  const methods = useForm<Values>({ defaultValues: { topic: "bug" } });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onValid)}>
        <SegmentedField<Topic> name="topic" label="Topic" options={OPTIONS} />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

describe("SegmentedField", () => {
  it("renders a radiogroup with the label as its accessible name", () => {
    render(<Harness onValid={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "Topic" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Bug" })).toBeChecked();
  });

  it("submits the selected value through react-hook-form", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<Harness onValid={onValid} />);

    await user.click(screen.getByRole("radio", { name: "Feature" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onValid).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "feature" }),
      expect.anything(),
    );
  });
});
