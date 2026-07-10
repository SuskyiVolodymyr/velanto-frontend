"use client";

import { Input } from "@/src/shared/components/Input";

// Search box for the home feed. Debouncing lives in the useHomeFeed hook; this
// component just reflects the raw input value.
export function PackSearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      type="search"
      aria-label="Search packs"
      placeholder="Search packs…"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
