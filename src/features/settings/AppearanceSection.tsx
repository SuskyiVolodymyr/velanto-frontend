"use client";

import { useEffect, useState } from "react";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { getStoredAccent, setStoredAccent } from "@/src/shared/lib/theme";

const DEFAULT_ACCENT = "#00e5ff";
const ACCENTS = [DEFAULT_ACCENT, "#7c8cff", "#39d98a", "#f5a623"];

export function AppearanceSection() {
  const [accent, setAccent] = useState(DEFAULT_ACCENT);

  // localStorage doesn't exist during server rendering, so this can't be a
  // lazy useState initializer without a hydration mismatch — it must run
  // only after mount, on the client.
  useEffect(() => {
    const stored = getStoredAccent();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setAccent(stored);
  }, []);

  function handleSelect(color: string) {
    setStoredAccent(color);
    setAccent(color);
  }

  return (
    <section className="flex flex-col gap-4">
      <Text as="h2" variant="tertiary" className="text-xs uppercase tracking-wide">
        Appearance
      </Text>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/[0.02] px-4 py-4">
        <div>
          <Text className="font-semibold">Accent color</Text>
          <Text variant="secondary" className="text-sm">
            Used for highlights, buttons, and progress bars.
          </Text>
        </div>
        <div className="flex gap-2">
          {ACCENTS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use accent color ${color}`}
              aria-pressed={accent === color}
              onClick={() => handleSelect(color)}
              className={cn(
                "h-7 w-7 rounded-[9px] border-2 transition-colors",
                accent === color ? "border-white" : "border-white/15",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
