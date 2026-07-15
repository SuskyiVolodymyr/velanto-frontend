# Mobile responsive audit — decisions to confirm

Audited every route at a 375px viewport. Below are the fixes I shipped and the
**open design questions** I want your call on (I picked a safe default for each
so nothing is left broken, but these could be done differently).

## Fixed (shipped in this pass)

- **Create form — format picker.** The 5 format cards were a non-wrapping row
  (~209px of horizontal overflow). Now a responsive grid: 2 columns on phones,
  3 on small tablets, 5 on desktop (desktop unchanged).
- **Admin / Moderation tables.** The shared `DataTable` is a fixed-px CSS grid;
  on a phone it was **clipping the right-hand columns** (Status, actions were
  unreachable). Now the table scrolls horizontally within its own container
  below ~672px, so every column stays reachable. Desktop unchanged (it just
  fills its container). ← **see decision 1**
- **Docs page.** The sidebar+article two-column layout didn't stack, overflowing
  ~39px. Now it stacks (sidebar above article) on phones, side-by-side on
  desktop. ← **see decision 2**
- **Bottom nav (hardening).** Long localized tab labels (e.g. uk "Сповіщення")
  could push the 5-tab bar past the viewport; tabs now shrink and labels
  truncate. ← **see decision 3**

Every other route (home, pack detail, play, result, settings, profile, feedback,
rules, report detail, account, notifications) had **no** horizontal overflow.

## Decisions — RESOLVED (2026-07-15, with the user)

1. **Admin/moderation tables on mobile → keep HORIZONTAL SCROLL.** ✅ Confirmed;
   already shipped. No card reflow.

2. **Docs sidebar on mobile → DROPDOWN.** ✅ Done. `DocsSidebar` now renders a
   grouped native `<select>` (optgroups per section) on phones and the sticky
   sidebar list on `md+`. New `docs.jumpTo` aria-label key, translated to all
   locales.

3. **Truncated nav labels → keep as-is.** ✅ Confirmed ("okay"). Labels ellipsize
   on very narrow screens; no per-locale short labels.

4. **Auth form → VERIFIED, no fix needed.** ✅ Checked `/auth` signed-out at
   375px (both Log in and Register tabs): centered card, 0px overflow. It was
   only ever a verification gap, not a design issue.
