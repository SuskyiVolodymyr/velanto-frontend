/**
 * The "VS" token between two contenders, for the room boards.
 *
 * A copy of solo play's `features/play/VsBadge` rather than an import: features
 * do not reach into one another here. It is duplicated once, deliberately, and
 * then shared within this feature — the room has three places that need it (a
 * 1v1 round, an nxn round's two sides, and the between-round reveal), and three
 * inline copies would be the thing worth avoiding.
 *
 * `self-center` matters: in the versus grid this sits in an `auto` column
 * between two full-height cards and would otherwise stretch to their height.
 */
export function VsDivider() {
  return (
    <span
      data-mono
      className="flex h-11 w-11 flex-none items-center justify-center justify-self-center self-center rounded-pill border border-white/10 bg-surface-card font-mono text-[12.5px] font-bold text-foreground/50"
    >
      VS
    </span>
  );
}
