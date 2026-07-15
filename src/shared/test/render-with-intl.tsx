import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "@tanstack/react-query";
import messages from "@/messages/en.json";
import { createTestQueryClient } from "./test-query-client";

// Wraps a component in the English message catalog plus a throwaway TanStack
// Query client so components that call useTranslations and/or useQuery render
// in unit tests without needing the real request pipeline. Import aliased as
// `render` to keep existing call sites unchanged. Passed as RTL's `wrapper`
// option (not inline children) so `rerender` re-applies the providers — a bare
// rerender would otherwise drop the intl/query context.
export function renderWithIntl(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={messages}>
          {children}
        </NextIntlClientProvider>
      </QueryClientProvider>
    );
  }
  return render(ui, { wrapper: Providers });
}
