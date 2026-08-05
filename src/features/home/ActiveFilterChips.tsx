"use client";

import { useTranslations } from "next-intl";
import {
  PACK_LANGUAGE_NAMES,
  type PackLanguage,
} from "@/src/shared/types/pack-language";
import type { PackTag } from "@/src/shared/types/pack";

/**
 * The strip of currently-applied tag/language filters, each removable, plus a
 * clear-all.
 *
 * Exists because the two popover triggers ("Filters" and the sort) looked
 * identical whether nothing or everything was selected — the state was real but
 * invisible until you opened the panel, so the feed could be cut down to a
 * handful of packs with no visible reason. Format and sort are deliberately not
 * repeated here: both already show their own state in the row above, and
 * echoing them would add noise rather than information.
 *
 * This is now the only place applied tags are shown outside the picker itself —
 * the old TagFilter wrapper, which rendered a second copy of these chips inside
 * a popover, went away with that popover.
 *
 * Renders nothing when no tag or language is active, so it costs no space in
 * the common case.
 */
export function ActiveFilterChips({
  tags,
  onTagsChange,
  languages,
  onLanguagesChange,
}: {
  tags: PackTag[];
  onTagsChange: (tags: PackTag[]) => void;
  languages: PackLanguage[];
  onLanguagesChange: (languages: PackLanguage[]) => void;
}) {
  const t = useTranslations("home");

  if (tags.length === 0 && languages.length === 0) return null;

  return (
    <ul
      aria-label={t("activeFilters")}
      className="flex flex-wrap items-center gap-1.5"
    >
      {tags.map((tag) => (
        <li key={`tag-${tag}`}>
          <RemovableChip
            label={tag}
            removeLabel={t("removeTagFilter", { tag })}
            onRemove={() => onTagsChange(tags.filter((other) => other !== tag))}
          />
        </li>
      ))}

      {languages.map((code) => (
        <li key={`lang-${code}`}>
          <RemovableChip
            label={PACK_LANGUAGE_NAMES[code]}
            removeLabel={t("removeLanguageFilter", {
              language: PACK_LANGUAGE_NAMES[code],
            })}
            onRemove={() =>
              onLanguagesChange(languages.filter((other) => other !== code))
            }
          />
        </li>
      ))}

      <li>
        <button
          type="button"
          onClick={() => {
            onTagsChange([]);
            onLanguagesChange([]);
          }}
          className="rounded-[8px] px-2 py-0.5 text-xs font-medium text-foreground-secondary underline transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
        >
          {t("clearFilters")}
        </button>
      </li>
    </ul>
  );
}

/** Small removable pill — the shape applied filters have always used here. */
function RemovableChip({
  label,
  removeLabel,
  onRemove,
}: {
  label: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={removeLabel}
      className="inline-flex items-center gap-1 rounded-[8px] border border-acc/30 bg-acc/10 px-2 py-0.5 text-xs font-medium text-acc transition-colors hover:bg-acc/20"
    >
      {label}
      <span aria-hidden className="text-acc/70">
        ✕
      </span>
    </button>
  );
}
