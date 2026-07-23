import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JoinByLink } from "@/src/features/friends-rooms/JoinByLink";

// The join route is a transient handoff — it holds no indexable content and its
// URL carries a room code, so keep it out of the index entirely (like the live
// room route it hands off to).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages");
  return {
    title: t("metaJoiningRoom"),
    robots: { index: false, follow: false },
  };
}

/**
 * The invite-link landing route. A thin wrapper: it reads the code from the URL
 * and hands off to {@link JoinByLink}, the client component that performs the
 * signed-out redirect or the join-and-route. Opening this URL is equivalent to
 * entering the code in the "Join by code" modal.
 */
export default async function JoinRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <JoinByLink code={code} />;
}
