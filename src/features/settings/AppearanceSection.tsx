"use client";

import { useState } from "react";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { useHydratedValue } from "@/src/shared/hooks/useHydratedValue";
import { ACCENTS, DEFAULT_ACCENT, getStoredAccent, setStoredAccent } from "@/src/shared/lib/theme";

export function AppearanceSection() {
  // The persisted accent (localStorage) is a client-only read, hydrated via
  // useHydratedValue — no set-state-in-effect, no hydration mismatch. `selected`
  // layers the optimistic in-session choice on top of the stored value.
  const storedAccent = useHydratedValue(() => getStoredAccent() ?? DEFAULT_ACCENT, DEFAULT_ACCENT);
  const [selected, setSelected] = useState<string | null>(null);
  const accent = selected ?? storedAccent;

  function handleSelect(color: string) {
    setStoredAccent(color);
    setSelected(color);
  }

  return (
    <section className="flex flex-col gap-4">
      <Text as="h2" variant="tertiary" className="text-xs uppercase tracking-wide">
        Appearance
      </Text>
      <Card className="flex items-center justify-between gap-4 hover:translate-y-0 hover:shadow-none">
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
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                accent === color ? "border-white" : "border-white/15",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </Card>
    </section>
  );
}
