import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { Card } from "@/src/shared/components/Card";
import type { Pack } from "@/src/shared/types/pack";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getPack(id: string): Promise<Pack | null> {
  const res = await fetch(`${API_BASE_URL}/packs/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load pack: ${res.status}`);
  return (await res.json()) as Pack;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pack = await getPack(id);
  return { title: pack ? pack.title : "Pack not found" };
}

/**
 * Minimal read-only view — just enough to confirm the create flow worked
 * end to end. The real Pack screen (cover art, stats, play CTA, comments)
 * is separate future work per screen-inventory.md item 3.
 */
export default async function PackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await getPack(id);
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
      <div className="flex flex-col gap-4">
        {pack.groups.map((group) => (
          <Card key={group.id} className="hover:translate-y-0 hover:shadow-none">
            <Text className="mb-2 font-semibold">{group.name}</Text>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => (
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
