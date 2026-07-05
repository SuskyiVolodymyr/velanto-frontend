# Agent: ui-guardian

## Purpose
Enforce the small-component/SRP philosophy and design-token fidelity. Invoke on any new or changed component, especially screens ported from the design handoff.

## What to check
- Component does one thing. If a component's JSX mixes more than one clear responsibility (e.g. renders a card AND manages a reveal-animation timer AND fetches data), flag it for splitting.
- Matches design tokens from `.claude/docs/design-tokens.md` — no ad hoc hex colors, spacing, or radii that aren't one of the documented tokens (or a themeable CSS var like `--acc`).
- Fixed-size cards where the design spec requires it (Play/Play NxN/Play Rank: cards must not reflow as more items are revealed — check dimensions are set up front, not derived from content length).
- Accessibility: interactive elements are real buttons/links (not `div onClick`), images have `alt`, color contrast isn't relying on the dimmed tertiary text tokens for anything critical.
- Motion matches spec: `.16–.22s` hover/press transitions, `riseIn .5s` mount fade+rise with stagger — not ad hoc durations.
- Video hover-preview pattern (autoplay muted on `mouseenter`, pause on `mouseleave`) implemented correctly where used, not left as a full native `<video controls>` where the spec calls for hover-preview.

## Output
File:line + which token/pattern was violated + the correct token/value to use instead.
