import { USERNAME_CHARS } from "@/src/features/auth/auth.schema";
import type { ReactNode } from "react";

// Built from the username charset rather than restating it, and mirroring the
// backend's own `mentions.ts` — the two must agree or a comment renders a
// mention the server never notified about (or vice versa). Both lookarounds use
// the charset, not `\w`: `\w` is ASCII-only, so an `@` glued to the end of a
// Cyrillic word would otherwise read as a mention.
const MENTION_PATTERN = new RegExp(
  `(?<!${USERNAME_CHARS}|@)@(${USERNAME_CHARS}{2,16})(?!${USERNAME_CHARS})`,
  "gu",
);

/**
 * Splits a comment body into plain text and accent-highlighted `@mention`
 * spans. Purely presentational — it highlights the same handles the backend
 * treats as mentions; unknown handles are highlighted too (the backend simply
 * doesn't notify for them), and emails / mid-word `@` stay plain text.
 */
export function renderCommentBody(body: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) nodes.push(body.slice(lastIndex, start));
    nodes.push(
      <span key={key++} className="font-medium text-acc">
        {match[0]}
      </span>,
    );
    lastIndex = start + match[0].length;
  }
  if (lastIndex < body.length) nodes.push(body.slice(lastIndex));
  return nodes;
}
