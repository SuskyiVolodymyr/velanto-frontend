import {
  AlertTriangle,
  AtSign,
  Bell,
  MessageCircle,
  Package,
  Reply,
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

// Tones must be raw hex: NotificationItem builds translucent fills by
// alpha-suffixing them (`${tone}14`), which a CSS var()/Tailwind token can't do
// via string concat. ACCENT/DANGER mirror the --acc/--danger design tokens
// (app/globals.css) — kept as named consts so the literals aren't re-typed
// inline (the two hues a component is told never to hardcode). The other three
// hues have no token equivalent.
const ACCENT = "#00e5ff"; // mirrors --acc
const DANGER = "#ff6b6b"; // mirrors --danger

const VISUALS: Record<NotificationType, NotificationVisual> = {
  new_follower: { tone: ACCENT, Icon: UserPlus, actor: true },
  new_pack_from_followed: { tone: "#a78bfa", Icon: Package, actor: true },
  new_comment: { tone: "#38bdf8", Icon: MessageCircle, actor: true },
  comment_mention: { tone: "#fbbf24", Icon: AtSign, actor: true },
  comment_reply: { tone: "#2dd4bf", Icon: Reply, actor: true },
  pack_deleted_warning: { tone: DANGER, Icon: AlertTriangle, actor: false },
};

// A type this client version doesn't recognise yet (newer backend) still gets a
// neutral, actor-less tile rather than crashing — mirrors describeNotification's
// generic fallback. Must be hex (not rgba()) so the alpha-suffix stays valid CSS.
const FALLBACK: NotificationVisual = {
  tone: "#8b8f96",
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
