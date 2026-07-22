import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
// #236: useFieldError now resolves catalog keys through next-intl, so any
// component rendering a field error needs the provider. renderWithIntl is
// aliased to `render` so the call sites below are unchanged.
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { PasswordField } from "./PasswordField";

function Harness() {
  const methods = useForm({ defaultValues: { password: "" } });
  return (
    <FormProvider {...methods}>
      <PasswordField
        name="password"
        label="Password"
        showLabel="Show password"
        hideLabel="Hide password"
      />
    </FormProvider>
  );
}

describe("PasswordField", () => {
  it("masks the input by default with a Show toggle", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("type", "button");
  });

  it("reveals the value and flips the toggle when clicked, then hides again", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    const toggle = screen.getByRole("button", { name: "Hide password" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    await user.click(toggle);
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByRole("button", { name: "Show password" }),
    ).toBeInTheDocument();
  });
});
