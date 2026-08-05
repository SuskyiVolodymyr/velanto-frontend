import {
  EyeOff,
  LayoutGrid,
  Repeat,
  Scissors,
  Swords,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";

/**
 * Resolves room-mode-copy's icon NAMES to components. Kept as its own plain
 * module (no "use client") so both the lobby's ModePicker (a client island)
 * and PackModesPanel (a server component on the pack detail page) can import
 * it without either pulling the other's client/server boundary along.
 */
export const ICON_BY_NAME: Record<string, LucideIcon> = {
  Swords,
  Users,
  Scissors,
  Vote,
  LayoutGrid,
  Repeat,
  EyeOff,
};
