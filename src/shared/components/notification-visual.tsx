import {
  AlertTriangle,
  AtSign,
  Bell,
  MessageCircle,
  Package,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@/src/shared/types/notification";

export interface NotificationVisual {
  /** The type's accent colour (hex) — drives the icon, avatar badge, unread
   *  stripe and dot. A semantic per-type hue, separate from the app accent. */
  tone: string;
  Icon: LucideIcon;
  /** true → the notification has a person behind it, so we show their avatar
   *  with the icon as a small badge; false → a standalone icon tile (system
   *  notifications like a moderator removal). */
  actor: boolean;
}

const VISUALS: Record<NotificationType, NotificationVisual> = {
  new_follower: { tone: "#00e5ff", Icon: UserPlus, actor: true },
  new_pack_from_followed: { tone: "#a78bfa", Icon: Package, actor: true },
  new_comment: { tone: "#38bdf8", Icon: MessageCircle, actor: true },
  comment_mention: { tone: "#fbbf24", Icon: AtSign, actor: true },
  pack_deleted_warning: { tone: "#ff6b6b", Icon: AlertTriangle, actor: false },
};

// A type this client version doesn't recognise yet (newer backend) still gets a
// neutral, actor-less tile rather than crashing — mirrors describeNotification's
// generic fallback.
const FALLBACK: NotificationVisual = {
  tone: "rgba(243,245,248,0.55)",
  Icon: Bell,
  actor: false,
};

export function notificationVisual(type: string): NotificationVisual {
  return VISUALS[type as NotificationType] ?? FALLBACK;
}

// Deterministic gradient per username so the same person always gets the same
// avatar colour across the list (and across sessions) without storing anything.
const GRADIENTS: readonly [string, string][] = [
  ["#22d3ee", "#0ea5e9"],
  ["#a78bfa", "#7c3aed"],
  ["#38bdf8", "#6366f1"],
  ["#fbbf24", "#f97316"],
  ["#34d399", "#059669"],
  ["#f472b6", "#db2777"],
];

export function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const [from, to] = GRADIENTS[hash % GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

export function avatarInitial(name: string): string {
  const letter = [...name].find((char) => /\p{L}|\p{N}/u.test(char));
  return (letter ?? name[0] ?? "?").toUpperCase();
}
