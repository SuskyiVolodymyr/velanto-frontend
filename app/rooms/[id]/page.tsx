import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RoomScreen } from "@/src/features/friends-rooms/RoomScreen";

// A live room is private, transient, and members-only — it holds no indexable
// content and its URL leaks nothing useful to a crawler, so keep it out of the
// index entirely.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages");
  return {
    title: t("metaRoom"),
    robots: { index: false, follow: false },
  };
}

/**
 * The room route. A thin wrapper: it reads the id from the URL and hands off to
 * {@link RoomScreen}, which is a client component that loads the room state over
 * the socket. No server-side pack fetch — nothing to render before the socket
 * connects.
 */
export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RoomScreen roomId={id} />;
}
