// Twitter/X reads twitter-image; reuse the same dynamic card as Open Graph so
// the pack cover+title previews everywhere, not just the OG consumers.
// `runtime` is route-segment config: Next requires it as a statically-parseable
// literal in the file and rejects re-exporting it, so it's declared here rather
// than pulled from ./opengraph-image with the rest.
export { default, size, contentType, alt } from "./opengraph-image";
export const runtime = "nodejs";
