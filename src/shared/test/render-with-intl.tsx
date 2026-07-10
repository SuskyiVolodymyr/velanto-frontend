import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";

// Wraps a component in the English message catalog so components that call
// useTranslations render in unit tests without needing the real request
// pipeline. Import aliased as `render` to keep existing call sites unchanged.
export function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}
