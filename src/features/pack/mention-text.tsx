import type { ReactNode } from "react";

// Same shape the backend resolves (auth username charset: 2–16 letters/digits;
// see the backend's extractMentions). The lookbehind keeps an `@` glued to a
// word character — e.g. an email like bob@example.com — from highlighting.
const MENTION_PATTERN = /(?<![\w@])@([a-zA-Z0-9]{2,16})(?![a-zA-Z0-9])/g;

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
