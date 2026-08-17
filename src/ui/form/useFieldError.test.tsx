import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { NextIntlClientProvider } from "next-intl";
import { useFieldError } from "./useFieldError";

function Probe() {
  const error = useFieldError("field");
  return <span data-testid="err">{error ?? "(none)"}</span>;
}

/**
 * Mounts useFieldError with an error on `field`, inside a real intl provider
 * carrying `messages`.
 *
 * The field is touched rather than the form submitted: `formState` is a
 * getter-backed proxy, so assigning `isSubmitted` throws. Touching is also
 * closer to what a real user does — the hook's gate is touched OR submitted.
 */
async function renderWithError(
  message: string,
  messages: Record<string, unknown>,
) {
  function Host() {
    const methods = useForm({ defaultValues: { field: "" } });
    useEffect(() => {
      methods.setValue("field", "x", { shouldTouch: true });
      methods.setError("field", { message });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <FormProvider {...methods}>
        <Probe />
      </FormProvider>
    );
  }

  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Host />
    </NextIntlClientProvider>,
  );
  return screen.findByTestId("err");
}

describe("useFieldError translation (#236)", () => {
  // The bug: zod schemas carry their messages as literal English, so a
  // Ukrainian user mistyping a password saw "Password must include an uppercase
  // letter." on an otherwise fully-localized form. Schemas now carry stable
  // keys and this hook resolves them at render.
  it("translates a message that names a catalog key", async () => {
    const node = await renderWithError("auth.errors.passwordUpper", {
      auth: { errors: { passwordUpper: "Пароль має містити велику літеру." } },
    });

    expect(node).toHaveTextContent("Пароль має містити велику літеру.");
  });

  // Not every schema has migrated (create-pack and new-feedback still carry
  // English literals). An unrecognised message must pass through untouched
  // rather than render a raw key at the user, so those forms keep working
  // exactly as before and can migrate one at a time.
  it("passes a plain message through when it is not a catalog key", async () => {
    const node = await renderWithError("Give your pack a title.", {
      auth: { errors: { passwordUpper: "unused" } },
    });

    expect(node).toHaveTextContent("Give your pack a title.");
  });

  // A key that looks like one but is missing must not blow up the form — the
  // user still needs to know the field is wrong.
  it("falls back to the raw message when the key is missing from the catalog", async () => {
    const node = await renderWithError("auth.errors.doesNotExist", {
      auth: { errors: { passwordUpper: "unused" } },
    });

    expect(node).toHaveTextContent("auth.errors.doesNotExist");
  });
});
