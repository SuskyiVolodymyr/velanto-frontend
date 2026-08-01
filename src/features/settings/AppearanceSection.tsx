"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/src/shared/components/Card";
import { Text } from "@/src/shared/components/Text";
import { SwatchPicker } from "@/src/shared/components/SwatchPicker";
import { useHydratedValue } from "@/src/shared/hooks/useHydratedValue";
import {
  ACCENTS,
  DEFAULT_ACCENT,
  getStoredAccent,
  setStoredAccent,
} from "@/src/shared/lib/theme";

export function AppearanceSection() {
  const t = useTranslations("settings");
  // The persisted accent (localStorage) is a client-only read, hydrated via
  // useHydratedValue — no set-state-in-effect, no hydration mismatch. `selected`
  // layers the optimistic in-session choice on top of the stored value.
  const storedAccent = useHydratedValue(
    () => getStoredAccent() ?? DEFAULT_ACCENT,
    DEFAULT_ACCENT,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const accent = selected ?? storedAccent;

  function handleSelect(color: string) {
    setStoredAccent(color);
    setSelected(color);
  }

  return (
    <section className="flex flex-col gap-4">
      <Text
        as="h2"
        variant="tertiary"
        className="text-xs uppercase tracking-wide"
      >
        {t("appearanceHeading")}
      </Text>
      <Card className="flex items-center justify-between gap-4">
        <div>
          <Text className="font-semibold">{t("accentColor")}</Text>
          <Text variant="secondary" className="text-sm">
            {t("accentColorHint")}
          </Text>
        </div>
        <SwatchPicker
          swatches={ACCENTS}
          value={accent}
          onChange={handleSelect}
          getLabel={(color) => t("accentColorSwatch", { color })}
          swatchStyle="solid"
        />
      </Card>
    </section>
  );
}
