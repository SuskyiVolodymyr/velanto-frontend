"use client";

import { useEffect } from "react";
import { getStoredAccent } from "@/src/shared/lib/theme";

export function ThemeInitializer() {
  useEffect(() => {
    const stored = getStoredAccent();
    if (stored) document.documentElement.style.setProperty("--acc", stored);
  }, []);

  return null;
}
