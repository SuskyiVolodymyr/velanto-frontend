import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { Card } from "@/src/shared/components/Card";
import { buttonClassName } from "@/src/shared/components/Button";
import { getPackServer } from "@/src/shared/lib/get-pack-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPackServer(id);
  return { title: pack ? pack.title : "Pack not found" };
}

/**
 * Minimal read-only view — just enough to confirm the create flow worked
 * end to end. The real Pack screen (cover art, stats, comments) is separate
 * future work per screen-inventory.md item 3.
 */
export default async function PackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await getPackServer(id);
  if (!pack) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-7 py-10">
      <Text as="h1" variant="title" className="mb-2 text-3xl">
        {pack.title}
      </Text>
      <Text variant="secondary" className="mb-4">
        {pack.description}
      </Text>
      {pack.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {pack.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      )}
      <Link href={`/packs/${pack.id}/play`} className={buttonClassName("primary", "mb-6 w-fit")}>
        Play
      </Link>
      <div className="flex flex-col gap-4">
        {(pack.format === "nxn" ? pack.categories : pack.groups)?.map((section) => (
          <Card key={section.id} className="hover:translate-y-0 hover:shadow-none">
            <Text className="mb-2 font-semibold">{section.name}</Text>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => (
                <li key={item.id}>
                  <Text variant="secondary" className="text-sm">
                    {item.title}
                  </Text>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </main>
  );
}
