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

## Decisions to confirm

1. **Admin/moderation tables on mobile — scroll vs card reflow.**
   I shipped **horizontal scroll** (the safe, data-preserving default — nothing
   is hidden, and it fixed all five tables at once via the shared component).
   The nicer-but-bigger alternative is to **reflow each row into a stacked card**
   on phones (label: value pairs), which reads better but is a per-table
   redesign. Want me to do the card reflow, or is horizontal scroll fine?

2. **Docs sidebar on mobile.**
   I stacked it as a **full-width list above the article**. It works but is a
   tall block to scroll past. Alternatives: collapse it into a dropdown/accordion
   ("Jump to…"), or hide it on mobile and rely on scrolling the article. Keep the
   stacked list, or switch to a dropdown?

3. **Truncated nav labels in long-label locales.**
   Tab labels now ellipsize if too long (e.g. "Сповіщення" → "Спов…" on very
   narrow screens). Acceptable, or should I shorten those specific catalog
   labels (e.g. a dedicated short "Alerts"-equivalent per locale)?

4. **Auth form — not verified.**
   I was signed in during the audit, so `/auth` redirected to home and I
   couldn't check the login/register form at 375px. It uses a standard centered
   card (low risk), but worth a manual look, or I can verify it signed-out.
