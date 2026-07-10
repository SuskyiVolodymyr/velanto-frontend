import Link from "next/link";
import { Text } from "@/src/shared/components/Text";
import type { Pack } from "@/src/shared/types/pack";

// Deterministic date formatting (fixed locale) so the server and the client
// fallback render identical markup and don't trip a hydration mismatch.
function formatPublished(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Creator strip linking to the author's profile. The design shows the author's
// handle and totals; we only have the authorId on the pack payload, so this is
// a leaner stand-in until that data is exposed.
export function PackCreatorCard({ pack }: { pack: Pack }) {
  const published = formatPublished(pack.createdAt);

  return (
    <Link
      href={`/users/${pack.authorId}`}
      className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-white/[0.02] px-[22px] py-5 transition-colors hover:border-border-strong"
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="h-11 w-11 flex-none rounded-[12px] border border-white/[0.12]"
          style={{
            background: `linear-gradient(150deg, ${pack.coverTone}, #0b0c0f)`,
          }}
        />
        <div>
          <Text className="text-[15px] font-semibold">View author</Text>
          {published && (
            <Text variant="tertiary" className="mt-0.5 text-xs">
              Published {published}
            </Text>
          )}
        </div>
      </div>
      <span className="rounded-[10px] border border-border bg-white/[0.05] px-[17px] py-2.5 text-sm font-medium text-foreground">
        View profile
      </span>
    </Link>
  );
}
