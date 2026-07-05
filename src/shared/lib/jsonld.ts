/**
 * Generic JSON-LD helper. No specific schema.org type (Quiz, Organization,
 * etc.) is wired up yet since there are no product pages — callers pass
 * their own schema.org shape and this just handles the `@context`
 * envelope + safe serialization for a <script type="application/ld+json">.
 */
export function buildJsonLd<T extends Record<string, unknown>>(
  data: T,
): T & { "@context": "https://schema.org" } {
  return {
    "@context": "https://schema.org",
    ...data,
  };
}

/**
 * Serializes a JSON-LD object for embedding via
 * `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />`.
 * Escapes `<` so a literal `</script>` in string values can't break out of
 * the script tag.
 */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
