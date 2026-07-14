"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Modal } from "@/src/shared/components/Modal";
import { mediaUrl } from "@/src/shared/lib/media-url";

/**
 * A {@link UserAvatar} that opens an enlarged view when clicked — but only when
 * the user actually has an uploaded image. With no `avatarKey` it renders the
 * plain initials avatar with no interactivity (nothing to enlarge). Drop-in for
 * `UserAvatar` on profile pages; `className` styles the avatar exactly as before.
 */
export function AvatarLightbox({
  username,
  avatarKey,
  className,
}: {
  username: string;
  avatarKey: string | null;
  className?: string;
}) {
  const t = useTranslations("profile");
  const [open, setOpen] = useState(false);

  if (!avatarKey) {
    return (
      <UserAvatar username={username} avatarKey={null} className={className} />
    );
  }

  const title = t("avatarViewTitle", { username });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={title}
        className="inline-flex cursor-zoom-in rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <UserAvatar
          username={username}
          avatarKey={avatarKey}
          className={className}
        />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        className="max-w-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- CDN-resolved, already-processed avatar; no Next image optimization (see media design). */}
        <img
          data-testid="avatar-enlarged"
          src={mediaUrl(avatarKey)}
          alt=""
          aria-hidden
          className="mx-auto aspect-square w-full max-w-[360px] rounded-[12px] object-cover"
        />
      </Modal>
    </>
  );
}
