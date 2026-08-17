/**
 * Six-stop palette for initial-avatars, from the Suggestion Detail mock. Kept as
 * literal CSS gradients rather than Tailwind classes: the pair is picked at
 * runtime from a hash, and Tailwind's JIT can't see an interpolated class.
 */
const GRADIENTS = [
  ["#22d3ee", "#0ea5e9"],
  ["#a78bfa", "#7c3aed"],
  ["#38bdf8", "#6366f1"],
  ["#fbbf24", "#f97316"],
  ["#34d399", "#059669"],
  ["#f472b6", "#db2777"],
] as const;

/**
 * A stable `linear-gradient(...)` for a name, used behind an initial where no
 * uploaded avatar is available. Deterministic on purpose — the same commenter
 * keeps the same colour down a thread and across reloads, which is the only
 * thing making initials scannable at all.
 */
export function avatarGradient(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  const [from, to] = GRADIENTS[hash % GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}
