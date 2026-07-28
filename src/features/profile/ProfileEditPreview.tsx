import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { Username } from "@/src/shared/components/Username";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import type { Role } from "@/src/shared/types/user";

/**
 * "How it looks" live preview card on `/profile/edit` (T10, plan D-decision:
 * "reuse identityKind/nicknameClass/identityPill, not fork them"). Mirrors
 * `AuthorProfileHeader`'s avatar+username+pill+bio block at a smaller scale
 * by reusing `UserAvatar`/`Username` directly — it does not re-derive the
 * gradient/pill treatment.
 *
 * Purely presentational, no state of its own: every prop is already the
 * live, resolved value `ProfileEditForm` computes today
 * (`draft ?? savedBio`, `usernameDraft ?? currentUsername`) — this component
 * does not repeat that null-coalescing, the caller's existing draft-or-saved
 * resolution is the one source of truth. `role`/`trusted` come straight from
 * the loaded profile (this form has no UI to edit them). `avatarKey` reflects
 * the profile query's cached avatar rather than a local draft: avatar
 * changes upload immediately through `AvatarSection`'s own crop-and-upload
 * flow and land here via cache invalidation, they never sit in form state.
 */
export function ProfileEditPreview({
  username,
  bio,
  role,
  trusted,
  avatarKey,
}: {
  username: string;
  bio: string;
  role?: Role | null;
  trusted?: boolean | null;
  avatarKey?: string | null;
}) {
  const t = useTranslations("profile");

  return (
    <Card>
      <Text
        variant="tertiary"
        className="mb-4 text-xs font-semibold uppercase tracking-[0.06em]"
      >
        {t("previewHeading")}
      </Text>
      <div className="flex items-center gap-3">
        <UserAvatar username={username} avatarKey={avatarKey} size="lg" />
        <Username
          username={username}
          role={role}
          trusted={trusted}
          showRole
          className="text-lg"
        />
      </div>
      {bio && (
        <Text variant="secondary" className="mt-3 text-sm">
          {bio}
        </Text>
      )}
    </Card>
  );
}
