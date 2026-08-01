import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { StreamerModeProvider } from "@/src/shared/lib/streamer-mode-context";
import { AuthorProfileHeader } from "./AuthorProfileHeader";
import type { PublicUserProfile } from "@/src/shared/types/user";

const profile: PublicUserProfile = {
  id: "author-1",
  username: "quizmaster",
  bio: "I make packs",
  createdAt: "2026-01-01T00:00:00.000Z",
  followerCount: 3,
  followingCount: 7,
  isFollowedByMe: false,
  role: "user",
  trusted: false,
};

function baseProps() {
  return {
    authorId: "author-1",
    profile,
    packsTotal: 12,
    isOwnProfile: false,
    followBusy: false,
    followBlocked: false,
    followError: "",
    onFollowToggle: vi.fn(),
  };
}

describe("AuthorProfileHeader", () => {
  it("renders the username and bio (plain user: no role pill)", () => {
    render(<AuthorProfileHeader {...baseProps()} />);
    expect(screen.getByText("quizmaster")).toBeInTheDocument();
    expect(screen.getByText("I make packs")).toBeInTheDocument();
    // A plain (non-staff, non-trusted) user gets no identity pill — Username's
    // own logic, exercised here via a trusted-role variant below.
    expect(screen.queryByText("TRUSTED")).not.toBeInTheDocument();
  });

  it("shows the role/trust pill for a trusted user, via the untouched Username component", () => {
    render(
      <AuthorProfileHeader
        {...baseProps()}
        profile={{ ...profile, trusted: true }}
      />,
    );
    expect(screen.getByText("quizmaster")).toBeInTheDocument();
    expect(screen.getByText(/trusted/i)).toBeInTheDocument();
  });

  it("renders the three real stats as value/label pairs, and no fabricated Plays stat", () => {
    // PublicUserProfile carries no aggregate play-count field today — the
    // mock's fourth "Plays" stat is deliberately dropped rather than
    // fabricated (T1). This negative assertion guards against it quietly
    // reappearing with a made-up number.
    render(<AuthorProfileHeader {...baseProps()} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Packs")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Followers")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Following")).toBeInTheDocument();
    expect(screen.queryByText("Plays")).not.toBeInTheDocument();
  });

  it("calls onSelectPeopleTab with 'followers' when the followers stat is clicked", async () => {
    const onSelectPeopleTab = vi.fn();
    render(
      <AuthorProfileHeader
        {...baseProps()}
        onSelectPeopleTab={onSelectPeopleTab}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /3\s*followers/i }),
    );
    expect(onSelectPeopleTab).toHaveBeenCalledWith("followers");
  });

  it("calls onSelectPeopleTab with 'following' when the following stat is clicked", async () => {
    const onSelectPeopleTab = vi.fn();
    render(
      <AuthorProfileHeader
        {...baseProps()}
        onSelectPeopleTab={onSelectPeopleTab}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /7\s*following/i }),
    );
    expect(onSelectPeopleTab).toHaveBeenCalledWith("following");
  });

  it("does not crash clicking a stat when onSelectPeopleTab is not passed", async () => {
    render(<AuthorProfileHeader {...baseProps()} />);
    await userEvent.click(
      screen.getByRole("button", { name: /3\s*followers/i }),
    );
    // No assertion beyond "didn't throw" — the click is a graceful no-op.
  });

  it("shows Follow (not Edit profile) for a visitor, and calls onFollowToggle", async () => {
    const onFollowToggle = vi.fn();
    render(
      <AuthorProfileHeader {...baseProps()} onFollowToggle={onFollowToggle} />,
    );
    expect(
      screen.queryByRole("link", { name: /edit profile/i }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(onFollowToggle).toHaveBeenCalled();
  });

  it("hides the follow control entirely for a signed-out (blocked) visitor", () => {
    render(<AuthorProfileHeader {...baseProps()} followBlocked />);
    expect(
      screen.queryByRole("button", { name: /^follow(ing)?$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the follow error message when present", () => {
    render(
      <AuthorProfileHeader
        {...baseProps()}
        followError="Couldn't update follow status. Try again."
      />,
    );
    expect(
      screen.getByText("Couldn't update follow status. Try again."),
    ).toBeInTheDocument();
  });

  it("shows Edit profile and New pack, and a pencil badge linking to /profile/edit, on your own profile", () => {
    render(<AuthorProfileHeader {...baseProps()} isOwnProfile />);
    expect(
      screen.queryByRole("button", { name: /^follow(ing)?$/i }),
    ).not.toBeInTheDocument();
    const newPackLink = screen.getByRole("link", { name: /create pack/i });
    expect(newPackLink).toHaveAttribute("href", "/create");

    // The pencil badge is a second, distinct link to the same destination
    // (an aria-label-only affordance overlapping the avatar).
    const editLinks = screen.getAllByRole("link", { name: /edit profile/i });
    expect(editLinks).toHaveLength(2);
    editLinks.forEach((link) =>
      expect(link).toHaveAttribute("href", "/profile/edit"),
    );
  });

  it("does not render a pencil badge or New pack link for a visitor", () => {
    render(<AuthorProfileHeader {...baseProps()} />);
    expect(
      screen.queryByRole("link", { name: /create pack/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /edit profile/i }),
    ).not.toBeInTheDocument();
  });

  it("prompts the owner to add a bio when there isn't one, and shows nothing to a visitor", () => {
    const noBioProfile = { ...profile, bio: null };
    const { unmount } = render(
      <AuthorProfileHeader
        {...baseProps()}
        profile={noBioProfile}
        isOwnProfile
      />,
    );
    expect(screen.getByText(/add a bio to tell people/i)).toBeInTheDocument();
    unmount();

    render(<AuthorProfileHeader {...baseProps()} profile={noBioProfile} />);
    expect(
      screen.queryByText(/add a bio to tell people/i),
    ).not.toBeInTheDocument();
  });

  it("redacts the avatar and name behind Reveal controls while streamer mode is on", () => {
    localStorage.setItem("velanto:streamer-mode", "on");
    render(
      <StreamerModeProvider>
        <AuthorProfileHeader {...baseProps()} />
      </StreamerModeProvider>,
    );
    expect(screen.queryByText("quizmaster")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /reveal/i }).length,
    ).toBeGreaterThan(0);
    localStorage.removeItem("velanto:streamer-mode");
  });

  it("sizes the redacted avatar's Hidden wrapper (not just the AvatarLightbox child) so the reveal button isn't 0×0", () => {
    // Regression: Hidden's own wrapper needs the size className too — while
    // hidden it renders a `h-full w-full` reveal button in place of
    // AvatarLightbox, which collapses to nothing if only the (unrendered)
    // child carries the dimensions.
    localStorage.setItem("velanto:streamer-mode", "on");
    render(
      <StreamerModeProvider>
        <AuthorProfileHeader {...baseProps()} />
      </StreamerModeProvider>,
    );
    const revealButtons = screen.getAllByRole("button", { name: /reveal/i });
    const avatarReveal = revealButtons.find((button) =>
      button.parentElement?.className.includes("h-[76px]"),
    );
    expect(avatarReveal).toBeDefined();
    localStorage.removeItem("velanto:streamer-mode");
  });
});
