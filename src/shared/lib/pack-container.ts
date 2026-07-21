/**
 * The one width every pack surface shares: detail, edit, and all five play
 * formats (plus their loading skeleton).
 *
 * These had drifted into four different containers — `max-w-[1120px]` on
 * detail, `max-w-5xl` on edit and the groups play formats, `max-w-2xl` on
 * rank_blind and 1v1. Moving between a pack's own pages visibly changed the
 * page's shape, for no reason any of those surfaces could justify.
 *
 * 70% of the viewport rather than a fixed max-width, so wide monitors actually
 * get used: at 1440px it lands near the old `max-w-5xl` (1008px vs 1024px), and
 * at 1920px it is 1344px instead of stopping at 1024px.
 *
 * The percentage only applies from `lg` up. Below that the viewport is already
 * narrow enough that taking 30% away would leave the content unreadable, so it
 * stays full-width with the usual gutter.
 *
 * NOTE the result screen (`app/packs/[id]/result`) deliberately still runs at
 * `max-w-2xl` — it is a column of prose-width rows, not a grid.
 */
export const PACK_CONTAINER = "mx-auto w-full px-7 lg:w-[70%]";
