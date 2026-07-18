import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { useAuth } from "@/src/shared/lib/auth-context";
import { ProfileRedirect } from "./ProfileRedirect";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/src/shared/lib/auth-context", () => ({ useAuth: vi.fn() }));

function setAuth(
  status: "loading" | "authenticated" | "unauthenticated",
  user: { id: string } | null = null,
) {
  vi.mocked(useAuth).mockReturnValue({
    status,
    user,
  } as ReturnType<typeof useAuth>);
}

function renderRedirect() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ProfileRedirect />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  replace.mockReset();
  vi.mocked(useAuth).mockReset();
});

describe("ProfileRedirect", () => {
  it("redirects an authenticated owner to their /users/[id] page", () => {
    setAuth("authenticated", { id: "u1" });
    renderRedirect();
    expect(replace).toHaveBeenCalledWith("/users/u1");
  });

  it("shows a login prompt (no redirect) when signed out", () => {
    setAuth("unauthenticated");
    renderRedirect();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/auth?next=%2Fprofile",
    );
  });

  it("waits without redirecting while the session is still loading", () => {
    setAuth("loading");
    renderRedirect();
    expect(replace).not.toHaveBeenCalled();
  });
});
