"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/src/shared/lib/auth-context";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { Badge } from "@/src/shared/components/Badge";
import { Username } from "@/src/shared/components/Username";
import { LoadingState } from "@/src/shared/components/LoadingState";
import { AuthorPacksRail } from "@/src/features/author/AuthorPacksRail";
import { RecentlyPlayedSection } from "@/src/features/author/RecentlyPlayedSection";
import { useAuthorBanHistory } from "@/src/features/author/api/author.queries";
import { useAdminUserDetail } from "@/src/features/admin/api/admin.queries";
import { isCurrentlyBanned } from "@/src/features/admin/use-users-admin";

/** A single labelled number tile in the stats grid. */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="hover:translate-y-0 hover:shadow-none">
      <Text variant="tertiary" className="text-xs">
        {label}
      </Text>
      <Text className="mt-1 text-2xl font-semibold">{value}</Text>
    </Card>
  );
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

/**
 * Admin-only deep view of a single user: account header, aggregate stats
 * (content / activity / social / moderation), their created packs and
 * recently-played rails, and ban history. Staff bypass the recently-played
 * privacy gate, so that rail is unconditionally visible here.
 */
export function AdminUserDetailScreen({ userId }: { userId: string }) {
  const t = useTranslations("admin");
  const { user: viewer, status } = useAuth();
  const router = useRouter();
  const allowed = viewer?.role === "admin" || viewer?.role === "manager";

  // Same client-side gate as AdminScreen: bounce non-staff to home. The
  // endpoint is server-side manager/admin-only regardless, so data never
  // loads for them even before this fires.
  useEffect(() => {
    if (status === "authenticated" && !allowed) router.replace("/");
  }, [status, allowed, router]);

  const query = useAdminUserDetail(userId);
  const banHistory = useAuthorBanHistory(userId, { enabled: true });

  if (status === "loading") return null;
  if (status === "unauthenticated" || !allowed) return null;

  const backLink = (
    <Link
      href="/admin?tab=users"
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-foreground-secondary transition-colors hover:text-foreground"
    >
      <ArrowLeft size={16} aria-hidden />
      {t("detailBack")}
    </Link>
  );

  if (query.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        {backLink}
        <LoadingState label={t("detailLoading")} showLabel />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        {backLink}
        <Text className="text-danger">{t("detailError")}</Text>
      </div>
    );
  }

  const user = query.data;
  const banned = isCurrentlyBanned(user.bannedUntil);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      {backLink}

      {/* Account header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text as="h1" variant="title" className="text-2xl">
            <Username
              username={user.username}
              role={user.role}
              trusted={user.trusted}
              showRole
            />
          </Text>
          <Text variant="tertiary" className="mt-1 text-sm">
            {t("detailEmail")}: {user.email} · {t("hRegistered")}:{" "}
            {new Date(user.createdAt).toLocaleDateString()}
          </Text>
          <Link
            href={`/users/${userId}`}
            className="mt-1 inline-block text-xs text-acc hover:underline"
          >
            {t("detailPublicProfile")}
          </Link>
        </div>
        <Badge className={banned ? "text-danger" : "text-success"}>
          {banned ? t("detailStatusBanned") : t("detailStatusActive")}
        </Badge>
      </div>

      {/* Content */}
      <Text as="h2" variant="title" className="mb-3 text-lg">
        {t("detailSecContent")}
      </Text>
      <StatGrid>
        <Stat label={t("hPacks")} value={user.content.packsTotal} />
        <Stat label={t("detailApproved")} value={user.content.packsApproved} />
        <Stat label={t("detailPending")} value={user.content.packsPending} />
        <Stat label={t("detailRejected")} value={user.content.packsRejected} />
        <Stat
          label={t("detailPlaysOnPacks")}
          value={user.content.totalPlaysOnPacks}
        />
        <Stat label={t("detailLikes")} value={user.content.likesOnPacks} />
      </StatGrid>

      {/* Activity */}
      <Text as="h2" variant="title" className="mb-3 mt-8 text-lg">
        {t("detailSecActivity")}
      </Text>
      <StatGrid>
        <Stat label={t("detailComments")} value={user.activity.commentsCount} />
        <Stat
          label={t("detailPacksPlayed")}
          value={user.activity.playsRecorded}
        />
      </StatGrid>

      {/* Social */}
      <Text as="h2" variant="title" className="mb-3 mt-8 text-lg">
        {t("detailSecSocial")}
      </Text>
      <StatGrid>
        <Stat label={t("detailFollowers")} value={user.social.followers} />
        <Stat label={t("detailFollowing")} value={user.social.following} />
      </StatGrid>

      {/* Moderation */}
      <Text as="h2" variant="title" className="mb-3 mt-8 text-lg">
        {t("detailSecModeration")}
      </Text>
      <StatGrid>
        <Stat
          label={t("detailReportsAgainst")}
          value={user.moderation.reportsAgainst}
        />
        <Stat
          label={t("detailReportsFiled")}
          value={user.moderation.reportsFiled}
        />
      </StatGrid>
      <div className="mt-4">
        <Text variant="secondary" className="mb-2 text-sm font-semibold">
          {t("detailBanHistory")}
        </Text>
        {banHistory.data && banHistory.data.items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {banHistory.data.items.map((entry, index) => (
              <div key={index} className="text-sm">
                <Text variant="tertiary" className="text-xs">
                  {new Date(entry.createdAt).toLocaleString()}
                </Text>
                <Text>
                  <span className="font-semibold">{entry.actorUsername}</span> ·{" "}
                  {entry.meta.duration} ·{" "}
                  <span className="text-foreground-secondary">
                    {entry.meta.reason}
                  </span>
                </Text>
              </div>
            ))}
          </div>
        ) : (
          <Text variant="tertiary" className="text-sm">
            {t("detailNoBanHistory")}
          </Text>
        )}
      </div>

      {/* Created packs + recently played rails */}
      <AuthorPacksRail authorId={userId} title={t("detailCreatedPacks")} />
      <RecentlyPlayedSection userId={userId} visible />
    </div>
  );
}
