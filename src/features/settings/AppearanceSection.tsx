"use client";

import { useEffect, useState } from "react";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { cn } from "@/src/shared/lib/cn";
import { ACCENTS, DEFAULT_ACCENT, getStoredAccent, setStoredAccent } from "@/src/shared/lib/theme";

export function AppearanceSection() {
  const [accent, setAccent] = useState<string>(DEFAULT_ACCENT);

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
