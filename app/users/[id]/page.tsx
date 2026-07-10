import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AuthorScreen } from "@/src/features/author/AuthorScreen";
import {
  getUserServer,
  getAuthorPacksServer,
} from "@/src/features/author/get-user-server";
import { buildJsonLd, jsonLdScript } from "@/src/shared/lib/jsonld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://velanto.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("pages");

  let profile;
  try {
    profile = await getUserServer(id);
  } catch {
    // Server-side profile fetch failed (network/5xx). Emit no per-page
    // metadata rather than a wrong "not found" — the page itself falls back
    // to the client path.
    return {};
  }
  if (!profile)
    return {
      title: t("userNotFound"),
      robots: { index: false, follow: false },
    };

  const url = `${SITE_URL}/users/${id}`;
  const title = `${profile.username} — Velanto`;
  const description =
    profile.bio?.trim() ||
    t("userMetaDescription", { username: profile.username });

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile" },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let profile;
  try {
    // Memoized with generateMetadata's identical fetch within this render, so
    // this is a single network call, not two.
    profile = await getUserServer(id);
  } catch {
    // Server fetch failed — hand off to the client-only path (it retries from
    // the browser) rather than hard-crashing the page.
    return <AuthorScreen authorId={id} />;
  }

  if (!profile) notFound();

  let packsPage;
  try {
    packsPage = await getAuthorPacksServer(id);
  } catch {
    // Profile loaded but packs didn't — don't seed a wrong (empty) pack list
    // that the seeded hook would never refetch; fall back to the client path.
    return <AuthorScreen authorId={id} />;
  }

  const initialData = {
    profile,
    packs: packsPage.items,
    packsTotal: packsPage.total,
  };

  const jsonLd = buildJsonLd({
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profile.username,
      url: `${SITE_URL}/users/${id}`,
      ...(profile.bio?.trim() ? { description: profile.bio.trim() } : {}),
    },
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <AuthorScreen authorId={id} initialData={initialData} />
    </>
  );
}
