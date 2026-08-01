import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { UserAvatar } from "@/src/shared/components/UserAvatar";
import { Username } from "@/src/shared/components/Username";
import type { PackAuthorSummary } from "@/src/shared/types/pack";
import type { PackAuthor } from "@/src/features/pack/api/pack-author";

/**
 * The pack-review screen's author card: avatar, role-badged handle, and
 * (once loaded) follower/pack-count stats. `author` is the lightweight
 * `PackAuthorSummary` already on the fetched `Pack` (immediate, flicker-free
 * identity); `authorProfile` is the richer `usePackAuthor` fetch
 * (`PackCreatorCard`/`AuthorHoverCard`'s existing hook, unchanged) that
 * fills in the stats line once it resolves.
 */
export function PackReviewAuthorCard({
  author,
  authorProfile,
}: {
  author: PackAuthorSummary | undefined;
  authorProfile: PackAuthor | undefined;
}) {
  const tProfile = useTranslations("profile");

  return (
    <section className="flex items-center gap-3.5 rounded-[16px] border border-border bg-white/[0.02] px-[22px] py-5">
      <UserAvatar
        username={author?.username ?? "?"}
        avatarKey={author?.avatarKey}
        size="lg"
      />
      <div className="min-w-0">
        <Text className="truncate text-[15px] font-semibold">
          <Username
            username={author?.username ?? "—"}
            role={author?.role}
            trusted={author?.trusted}
            at
            showRole
          />
        </Text>
        {authorProfile && (
          <Text variant="tertiary" className="mt-0.5 text-xs">
            {tProfile("followerAndPackCount", {
              followers: authorProfile.profile.followerCount,
              packs: authorProfile.packsTotal,
            })}
          </Text>
        )}
      </div>
    </section>
  );
}
