import { Text } from "@/src/shared/components/Text";
import { Badge } from "@/src/shared/components/Badge";
import { formatDate } from "@/src/shared/lib/format-date";
import type { UpdateEntry } from "./updates-data";

export interface UpdatesScreenProps {
  heading: string;
  intro: string;
  /** Shown in place of the list when there are no entries yet. */
  emptyLabel: string;
  entries: UpdateEntry[];
}

/**
 * Presentational changelog page. String-driven like {@link LegalScreen} so the
 * route resolves the locale and the component stays trivially testable. Sorts
 * newest-first here so the data file's authoring order isn't load-bearing.
 */
export function UpdatesScreen({
  heading,
  intro,
  emptyLabel,
  entries,
}: UpdatesScreenProps) {
  const ordered = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main className="mx-auto w-full max-w-[760px] px-6 py-12">
      <Text as="h1" variant="title" className="mb-3 text-3xl">
        {heading}
      </Text>
      <Text variant="secondary" className="mb-8 text-base leading-relaxed">
        {intro}
      </Text>

      {ordered.length === 0 ? (
        <Text variant="tertiary" className="text-base">
          {emptyLabel}
        </Text>
      ) : (
        <div className="flex flex-col gap-5">
          {ordered.map((entry) => (
            <article
              key={`${entry.version}-${entry.date}`}
              className="rounded-[15px] border border-border bg-surface p-5"
            >
              <div className="mb-2 flex items-center gap-3">
                <Badge variant="accent">v{entry.version}</Badge>
                <Text as="span" variant="tertiary" className="text-sm">
                  {formatDate(entry.date)}
                </Text>
              </div>
              <Text as="h2" variant="title" className="mb-3 text-xl">
                {entry.title}
              </Text>
              <ul className="flex list-disc flex-col gap-2 ps-6">
                {entry.bullets.map((bullet, index) => (
                  <li key={index}>
                    <Text
                      variant="secondary"
                      className="text-base leading-relaxed"
                    >
                      {bullet}
                    </Text>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
