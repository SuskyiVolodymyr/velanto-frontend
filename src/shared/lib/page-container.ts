/**
 * The page column every route sits in.
 *
 * Every screen in `design/extracted_new/*.dc.html` wraps its content in one
 * `data-el="page"` element shaped the same way:
 *
 *     max-width:<N>px; margin:0 auto; padding:… 30px …
 *
 * …and drops the gutter to 16px on small screens. Only `<N>` differs, and it
 * differs per screen on purpose: a pack's detail page is a 1320px canvas, the
 * profile editor is a 680px form. What the mocks never do is size the column as
 * a *percentage of the viewport* — which is what the old `PACK_CONTAINER`
 * (`lg:w-[70%]`) did, so the same page was a different shape on every monitor
 * and the two-column result layout had to be pushed out to a 1440px breakpoint
 * to have room to exist. Several listings (dashboard, my-packs, people) had no
 * cap at all and ran edge to edge, which is what made moving between routes
 * feel like the layout was jumping around.
 *
 * The small-screen gutter switches at 720px here. The mocks use 620/640/720
 * depending on the screen, but that number is each mock's own content
 * breakpoint rather than a statement about gutters, and the difference is 14px
 * of padding on a phone.
 *
 * Every entry is written out in full because Tailwind's JIT only emits
 * utilities it can find spelled out in the source — a computed
 * `max-w-[${width}px]` compiles to a class with no CSS behind it, and the page
 * silently goes full-bleed. `page-container.test.ts` pins the table for that
 * reason.
 */
export const PAGE_CONTAINERS = {
  /**
   * Pack Detail, Create/Edit Pack, Room Lobby, Room Round — and, by the
   * owner's call, every long-form reading page too (Docs, Rules, Legal,
   * Updates, Profile). Their own mocks draw them at 1060-1080px, but those
   * mocks were each composed at exactly their own width, where the margin
   * reads as page padding; side by side with a 1320px pack page in the real
   * app they just looked narrow. Their content fills the column rather than
   * keeping the mock's inner measure cap (672/720px) — at 1320px that cap left
   * a dead strip on one side and made the page read as off-centre.
   */
  1320: "mx-auto w-full max-w-[1320px] px-[30px] max-[720px]:px-4",
  /** Results, Moderation Review. */
  1240: "mx-auto w-full max-w-[1240px] px-[30px] max-[720px]:px-4",
  /** Admin, Moderation, Preferences. */
  1180: "mx-auto w-full max-w-[1180px] px-[30px] max-[720px]:px-4",
  /** Solo Play (all five formats), Suggestions. */
  1120: "mx-auto w-full max-w-[1120px] px-[30px] max-[720px]:px-4",
  /** Pack Review Outcome. */
  1100: "mx-auto w-full max-w-[1100px] px-[30px] max-[720px]:px-4",
  /** Admin User Detail. */
  1040: "mx-auto w-full max-w-[1040px] px-[30px] max-[720px]:px-4",
  /** Suggestion Detail. */
  720: "mx-auto w-full max-w-[720px] px-[30px] max-[720px]:px-4",
  /** Profile Edit. */
  680: "mx-auto w-full max-w-[680px] px-[30px] max-[720px]:px-4",
} as const;

export type PageWidth = keyof typeof PAGE_CONTAINERS;

/**
 * The same gutter with NO cap, for the pages that live inside the sidebar
 * shell. Dashboard is the only mock built that way — its page element is
 * `flex:1; padding:26px 30px 60px` with no max-width, because the sidebar
 * already takes the left of the viewport and a centred column beside it would
 * sit visibly off to one side. (Its footer *is* capped at 1120px, which is a
 * trap: the footer spans the full width, so its cap is not the page's.)
 *
 * `/my-packs` and `/people` have no mock of their own but are the same
 * sidebar-reached grid listings, so they follow Dashboard rather than adopting
 * a cap none of them was designed with.
 */
export const PAGE_CONTAINER_FULL = "w-full px-[30px] max-[720px]:px-4";

/** The container class for a page whose mock caps its column at `width`px. */
export function pageContainer(width: PageWidth): string {
  return PAGE_CONTAINERS[width];
}
