"use client";

import { useState } from "react";
import type { RoomMode } from "@/src/features/friends-rooms/room-types";
import type { LabSwitcher } from "./DesignLabBar";
import {
  FORMAT_LABEL,
  LAB_FORMATS,
  MODE_LABEL,
  labGuessingModes,
  labModes,
} from "./mock-room";
import type { LabFormat } from "./mock-room";

/**
 * The lab's format/mode pair, and the switchers that drive it.
 *
 * Shared by all three lab pages because the awkward part is the same on each:
 * the two dimensions are NOT independent. Claim exists on an elimination pack
 * and nowhere else; Relay only on rank_blind. So changing the format can strand
 * the current mode on a format that cannot run it — which in a real room is
 * impossible, and in the lab would render a board the product never shows.
 *
 * Resolved by deriving the mode rather than storing it outright: the state is a
 * PREFERENCE, and the mode actually used is that preference if the format still
 * offers it, or the format's first mode if not.
 */
export function useLabSelection(
  initialFormat: LabFormat = "1v1",
  /** Restrict to the modes with an endgame — the guessing page's whole set. */
  guessingOnly = false,
) {
  const [format, setFormat] = useState<LabFormat>(initialFormat);
  const [preferredMode, setPreferredMode] = useState<RoomMode | null>(null);

  const modes = guessingOnly ? labGuessingModes(format) : labModes(format);
  const mode =
    preferredMode && modes.includes(preferredMode) ? preferredMode : modes[0];

  const switchers: LabSwitcher[] = [
    {
      label: "Format",
      options: LAB_FORMATS.map((f) => ({ value: f, label: FORMAT_LABEL[f] })),
      value: format,
      onChange: (value) => setFormat(value as LabFormat),
    },
    {
      label: "Mode",
      options: modes.map((m) => ({ value: m, label: MODE_LABEL[m] })),
      value: mode,
      onChange: (value) => setPreferredMode(value as RoomMode),
    },
  ];

  return { format, mode, switchers };
}
