import type { BanDuration } from "@/src/shared/lib/users-client";

export const BAN_DURATIONS: { value: BanDuration; label: string }[] = [
  { value: "week", label: "1 week" },
  { value: "month", label: "1 month" },
  { value: "year", label: "1 year" },
  { value: "forever", label: "Forever" },
];
