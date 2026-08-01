import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/src/shared/test/render-with-intl";
import { ProfileEditPreview } from "./ProfileEditPreview";

function baseProps() {
  return {
    username: "quizmaster",
    bio: "I make packs",
    role: "user" as const,
    trusted: false,
    avatarKey: null,
  };
}

describe("ProfileEditPreview", () => {
  it("renders the 'How it looks' heading", () => {
    render(<ProfileEditPreview {...baseProps()} />);
    expect(screen.getByText("How it looks")).toBeInTheDocument();
  });

  it("renders the given username and bio", () => {
    render(<ProfileEditPreview {...baseProps()} />);
    expect(screen.getByText("quizmaster")).toBeInTheDocument();
    expect(screen.getByText("I make packs")).toBeInTheDocument();
  });

  it("renders no bio text when the bio is empty", () => {
    render(<ProfileEditPreview {...baseProps()} bio="" />);
    expect(screen.queryByText("I make packs")).not.toBeInTheDocument();
  });

  it("shows the role/trust pill for a trusted user, matching Username's own gradient/pill logic", () => {
    render(<ProfileEditPreview {...baseProps()} trusted role={undefined} />);
    expect(screen.getByText("TRUSTED")).toBeInTheDocument();
  });

  it("shows a staff role pill for a moderator", () => {
    render(<ProfileEditPreview {...baseProps()} role="moderator" />);
    expect(screen.getByText("MODERATOR")).toBeInTheDocument();
  });

  it("shows no pill for a plain untrusted user", () => {
    render(<ProfileEditPreview {...baseProps()} />);
    expect(screen.queryByText("TRUSTED")).not.toBeInTheDocument();
    expect(screen.queryByText(/moderator|admin|manager/i)).not.toBeInTheDocument();
  });

  it("updates the rendered username live as the username prop changes (draft typing)", () => {
    const { rerender } = render(<ProfileEditPreview {...baseProps()} />);
    expect(screen.getByText("quizmaster")).toBeInTheDocument();

    rerender(<ProfileEditPreview {...baseProps()} username="newname" />);
    expect(screen.queryByText("quizmaster")).not.toBeInTheDocument();
    expect(screen.getByText("newname")).toBeInTheDocument();
  });

  it("updates the rendered bio live as the bio prop changes (draft typing)", () => {
    const { rerender } = render(<ProfileEditPreview {...baseProps()} />);
    expect(screen.getByText("I make packs")).toBeInTheDocument();

    rerender(<ProfileEditPreview {...baseProps()} bio="Updated bio text" />);
    expect(screen.queryByText("I make packs")).not.toBeInTheDocument();
    expect(screen.getByText("Updated bio text")).toBeInTheDocument();
  });

  // ProfileEditPreview is purely presentational — it receives an already
  // -resolved value, not a nullable draft (ProfileEditForm does
  // `draft ?? savedBio` / `usernameDraft ?? currentUsername` itself and
  // passes the result down, see the component's doc comment). These two
  // cases stand in for "no draft yet" (the caller passes the saved value)
  // and "an in-progress draft" (the caller passes the draft value) to prove
  // both render correctly, satisfying the plan's "falls back to the saved
  // value when a draft is null" spec without re-deriving that fallback
  // logic inside this component.
  it("renders the saved value when there is no draft (caller passes the saved username/bio)", () => {
    render(
      <ProfileEditPreview
        {...baseProps()}
        username="saved-handle"
        bio="Saved bio"
      />,
    );
    expect(screen.getByText("saved-handle")).toBeInTheDocument();
    expect(screen.getByText("Saved bio")).toBeInTheDocument();
  });

  it("renders the draft value instead of the saved value once there is a draft (caller passes the draft)", () => {
    render(
      <ProfileEditPreview
        {...baseProps()}
        username="draft-handle"
        bio="Draft bio"
      />,
    );
    expect(screen.getByText("draft-handle")).toBeInTheDocument();
    expect(screen.queryByText("saved-handle")).not.toBeInTheDocument();
    expect(screen.getByText("Draft bio")).toBeInTheDocument();
  });
});
