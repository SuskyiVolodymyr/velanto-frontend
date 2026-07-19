import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, it, expect } from "vitest";
import messages from "@/messages/en.json";
import { NotificationItem } from "./NotificationItem";
import type { Notification } from "@/src/shared/types/notification";

function renderItem(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const base = {
  id: "n1",
  readAt: null,
  createdAt: new Date().toISOString(),
};

describe("NotificationItem", () => {
  it("renders a follower notification: message, actor initial avatar, unread mark, and profile link", () => {
    const notification = {
      ...base,
      type: "new_follower",
      payload: { followerId: "u2", followerUsername: "bob" },
    } as Notification;
    renderItem(
      <NotificationItem notification={notification} onNavigate={() => {}} />,
    );

    expect(screen.getByText("@bob")).toBeInTheDocument();
    expect(screen.getByTestId("notification-avatar")).toHaveTextContent("B");
    expect(screen.getByTestId("notification-unread")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/users/u2");
  });

  it("omits the unread mark once a notification has been read", () => {
    const notification = {
      ...base,
      readAt: new Date().toISOString(),
      type: "new_follower",
      payload: { followerId: "u2", followerUsername: "bob" },
    } as Notification;
    renderItem(
      <NotificationItem notification={notification} onNavigate={() => {}} />,
    );

    expect(screen.queryByTestId("notification-unread")).not.toBeInTheDocument();
  });

  it("renders a mention with the mentioner's avatar and a link to the pack", () => {
    const notification = {
      ...base,
      type: "comment_mention",
      payload: {
        packId: "p1",
        packTitle: "My Pack",
        commentId: "c1",
        mentionerUsername: "kaeya",
      },
    } as Notification;
    renderItem(
      <NotificationItem notification={notification} onNavigate={() => {}} />,
    );

    expect(screen.getByTestId("notification-avatar")).toHaveTextContent("K");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/packs/p1");
  });

  it("renders a moderation warning as an actor-less icon tile with no link", () => {
    const notification = {
      ...base,
      type: "pack_deleted_warning",
      payload: { packTitle: "My Pack" },
    } as Notification;
    renderItem(
      <NotificationItem notification={notification} onNavigate={() => {}} />,
    );

    expect(screen.getByText(/was removed by a moderator/i)).toBeInTheDocument();
    expect(screen.getByTestId("notification-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("notification-avatar")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders a comment notification with the commenter's avatar and a link to the pack", () => {
    const notification = {
      ...base,
      type: "new_comment",
      payload: { packId: "p1", packTitle: "My Pack", commenterUsername: "sam" },
    } as Notification;
    renderItem(
      <NotificationItem notification={notification} onNavigate={() => {}} />,
    );

    expect(screen.getByTestId("notification-avatar")).toHaveTextContent("S");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/packs/p1");
  });

  it("shows the comment excerpt as a snippet, the tone-coloured pack, and a type label", () => {
    const notification = {
      ...base,
      type: "new_comment",
      payload: {
        packId: "p1",
        packTitle: "My Pack",
        commenterUsername: "sam",
        excerpt: "this tier order is perfect",
      },
    } as Notification;
    renderItem(
      <NotificationItem notification={notification} onNavigate={() => {}} />,
    );

    expect(screen.getByText(/this tier order is perfect/)).toBeInTheDocument();
    // The pack title is rendered (tone-coloured), and the "Comment" kind label.
    expect(screen.getByText("My Pack")).toBeInTheDocument();
    expect(screen.getByText("Comment")).toBeInTheDocument();
  });

  it("renders no snippet when a comment notification carries no excerpt", () => {
    const notification = {
      ...base,
      type: "new_comment",
      payload: { packId: "p1", packTitle: "My Pack", commenterUsername: "sam" },
    } as Notification;
    renderItem(
      <NotificationItem notification={notification} onNavigate={() => {}} />,
    );

    // Only the message + meta; no quoted snippet text present.
    expect(screen.queryByText(/“|”/)).not.toBeInTheDocument();
  });

  it("renders an unrecognised (future) type as a neutral icon tile without crashing", () => {
    const notification = {
      ...base,
      type: "some_future_type",
      payload: {},
    } as unknown as Notification;
    renderItem(
      <NotificationItem notification={notification} onNavigate={() => {}} />,
    );

    expect(screen.getByText("You have a new notification")).toBeInTheDocument();
    expect(screen.getByTestId("notification-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("notification-avatar")).not.toBeInTheDocument();
  });
});
