/**
 * The one width every play surface shares — header and all five formats.
 *
 * They had drifted apart: the groups formats (save_one / sacrifice_one / nxn)
 * ran at `max-w-5xl` while rank_blind and 1v1 ran at `max-w-2xl`, barely half
 * as wide. Playing two packs back to back visibly changed the page's shape,
 * for no reason either format could justify.
 *
 * 70% of the viewport rather than a fixed max-width, so wide monitors actually
 * get used: at 1440px it lands near the old `max-w-5xl` (1008px vs 1024px), and
 * at 1920px it is 1344px instead of stopping at 1024px.
 *
 * The percentage only applies from `lg` up. Below that the viewport is already
 * narrow enough that taking 30% away would leave the cards unreadable, so it
 * stays full-width with the usual gutter.
 */
export const PLAY_CONTAINER = "mx-auto w-full px-7 lg:w-[70%]";
