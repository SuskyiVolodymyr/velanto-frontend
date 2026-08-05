import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

/**
 * Either a `userEvent.setup()` instance or the bare default export — suites use
 * both, and the two differ only in return types this helper never reads.
 */
type User =
  Pick<ReturnType<typeof userEvent.setup>, "click"> | typeof userEvent;

/**
 * Choose an option from the app's {@link Dropdown}.
 *
 * Dropdown is a listbox (button + floating panel), not a native `<select>`, so
 * `userEvent.selectOptions` does not apply and the options do not exist in the
 * DOM at all until the trigger is opened. Two steps, in one helper, because
 * every call site would otherwise repeat them.
 *
 * `name` matches the trigger's accessible name; `option` matches the option row.
 */
export async function pickFromDropdown(
  user: User,
  name: string | RegExp,
  option: string | RegExp,
): Promise<void> {
  const trigger = await screen.findByRole("combobox", { name });
  await user.click(trigger);
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: option }));
}
