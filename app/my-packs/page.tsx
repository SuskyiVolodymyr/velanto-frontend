import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Text } from "@/src/shared/components/Text";
import Link from "next/link";
import { buttonClassName } from "@/src/shared/components/Button";
import { PlusIcon } from "@/src/shared/components/icons";
import { PageHeader } from "@/src/shared/components/PageHeader";
import { cn } from "@/src/shared/lib/cn";
import { PAGE_CONTAINER_FULL } from "@/src/shared/lib/page-container";
import { MyPacksFeed } from "@/src/features/home/MyPacksFeed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("myPacks");
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    // A private, per-user view keyed off the signed-in session — nothing for a
    // crawler to index. The sidebar routes a signed-out user to /auth; a direct
    // visit renders MyPacksFeed's login-required prompt (no server redirect).
    robots: { index: false, follow: false },
  };
}

/**
 * The signed-in author's own packs, split out of the old Browse tab strip into
 * its own route (2.0.0 shell). MyPacksFeed handles the auth gate and the
 * status-filtered fetch; this route just frames it and marks the page noindex.
 */
export default async function MyPacksPage() {
  const t = await getTranslations("myPacks");
  const th = await getTranslations("header");
  return (
    <>
      <PageHeader
        back={{ href: "/", label: th("browse") }}
        crumb={t("title")}
        // Authoring starts here as much as it does on the dashboard, and until
        // now the only Create button lived in the dashboard's top bar — so
        // from your own packs list there was no way to start another one
        // without going home first.
        trailing={
          <Link
            href="/create"
            className={`${buttonClassName("primary", undefined, "sm")} hidden min-[881px]:inline-flex`}
          >
            <PlusIcon size={15} strokeWidth={2.4} />
            {th("create")}
          </Link>
        }
      />
      <main className={cn(PAGE_CONTAINER_FULL, "flex-1 py-10")}>
        <Text as="h1" variant="title" className="mb-2 text-3xl">
          {t("title")}
        </Text>
        <Text variant="secondary" className="mb-8 max-w-lg">
          {t("subtitle")}
        </Text>
        <MyPacksFeed />
      </main>
    </>
  );
}
