import type { BackOrigin } from "@/src/shared/lib/use-back-target";

// Every path may carry an optional locale prefix (next-intl's localePrefix
// emits the root as `/en`), so each pattern allows one.
const L = "(?:/[a-z]{2})?";

/**
 * The pages a back pill can be sent back to, one entry per place in the app
 * that links somewhere else.
 *
 * Kept in one file rather than inline per screen so a new listing that links to
 * pack detail (say) is added once, and so the labels stay consistent — the
 * pill for "you came from People" should read the same wherever it appears.
 */
export const FROM: Record<string, BackOrigin> = {
  dashboard: { match: new RegExp(`^${L}/?$`), labelKey: "shell.nav.browse" },
  myPacks: {
    match: new RegExp(`^${L}/my-packs/?$`),
    labelKey: "shell.nav.myPacks",
  },
  history: {
    match: new RegExp(`^${L}/history/?$`),
    labelKey: "shell.nav.history",
  },
  people: {
    match: new RegExp(`^${L}/people/?$`),
    labelKey: "shell.nav.people",
  },
  suggestions: {
    match: new RegExp(`^${L}/feedback/?$`),
    labelKey: "shell.nav.suggestions",
  },
  rules: { match: new RegExp(`^${L}/rules/?$`), labelKey: "shell.nav.rules" },
  docs: { match: new RegExp(`^${L}/docs/?$`), labelKey: "header.docs" },
  updates: {
    match: new RegExp(`^${L}/updates/?$`),
    labelKey: "footer.updates",
  },
  terms: { match: new RegExp(`^${L}/terms/?$`), labelKey: "footer.terms" },
  privacy: {
    match: new RegExp(`^${L}/privacy/?$`),
    labelKey: "footer.privacy",
  },
  admin: {
    match: new RegExp(`^${L}/admin(?:\\?|/?$)`),
    labelKey: "header.admin",
  },
  moderation: {
    match: new RegExp(`^${L}/moderation/?$`),
    labelKey: "header.moderation",
  },
  /** Any person's page, including your own — the same route either way. */
  profile: {
    match: new RegExp(`^${L}/users/[^/]+/?$`),
    labelKey: "pages.metaProfile",
  },
  /**
   * A suggestion's own page — its comments carry author links, so a profile can
   * be opened from one. Generic "Back" for the same reason as `packDetail`.
   */
  suggestionDetail: {
    match: new RegExp(`^${L}/feedback/[^/]+/?$`),
    labelKey: "pages.back",
  },
  /**
   * A pack's own page. Labelled with the generic "Back" rather than a name: the
   * pack is known by its title, which the page being returned FROM has no way
   * to look up without a fetch it otherwise wouldn't make.
   */
  packDetail: {
    match: new RegExp(`^${L}/packs/[^/]+/?$`),
    labelKey: "pages.back",
  },
};
