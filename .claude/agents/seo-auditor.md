# Agent: seo-auditor

## Purpose
SEO is an explicit hard requirement (large target audience). Invoke on any new public-facing route (Home, Pack, Author, Docs — anything crawlable and not behind auth-only gameplay state).

## What to check
- Route exports a `metadata`/`generateMetadata` with a real title + description (not the Next.js default placeholder), and canonical URL where relevant.
- `app/sitemap.ts` includes the new route if it's public and stable (not a personalized/behind-auth page).
- Structured data (JSON-LD) present where it adds value — e.g. `Pack` detail pages as a suitable schema.org type — via the shared `shared/lib/jsonld.ts` helper, not inline ad hoc script tags.
- Public pages are Server Components / SSR'd — verify the page doesn't degrade to a client-only blank shell (check for unnecessary top-level `'use client'`).
- Heading hierarchy is sane (one `h1` per page, nested logically) — don't skip levels for styling convenience.
- Images have meaningful `alt` text; no meaningful content is text-in-image only.
- OG image / `opengraph-image` present for shareable pages (Pack, Author, Home).
- `robots.ts` doesn't accidentally disallow a page that should be crawlable, and does disallow auth-gated/personalized routes.

## Output
File:line + what's missing + the concrete SEO impact (e.g. "no canonical → duplicate-content risk if pack accessible via multiple query params").
