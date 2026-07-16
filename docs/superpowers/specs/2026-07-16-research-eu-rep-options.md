# GDPR Art. 27 EU Representative — Options Research (Velanto)

**Date:** 2026-07-16
**Context:** Solo developer established in Ukraine, free quiz platform (Velanto), EU users.
Art. 27 designation obligation already ESTABLISHED (EDPB Guidelines 3/2018 — "occasional" exemption
does not apply to a platform with persistent user accounts). This document addresses **HOW** to designate.

**Candidate option under consideration:** a friend — Ukrainian citizen, resident in **BELGIUM**.

**Source marking convention:** PRIMARY = regulation text / official gazette / DPA decision / EDPB.
SECONDARY = commentary, law-firm blogs, press. VENDOR = EU-rep-as-a-service marketing (treat as biased —
they have a direct incentive to overstate both the obligation and the enforcement risk).

---

## STATUS: COMPLETE — all three parts researched. See SUMMARY & RECOMMENDATION near the end.

---

## PART 1 — Belgium-specific analysis

### 1.1 KEY FINDING: Belgium is NOT silent — Art. 228 of the Loi du 30 juillet 2018

**PRIMARY** — Belgian Law of 30 July 2018 (GDPR implementation act), Title 6 "Sanctions",
Chapter II "Sanctions pénales", **Article 228**, retrieved verbatim from the federal legal
database jurion.fanc.fgov.be (Title 6 = wettekstId 27607; Chapter II = wettekstId 27610):

> « Sans préjudice de dispositions particulières, le responsable du traitement, le sous-traitant,
> ou **son représentant en Belgique** est civilement responsable du paiement des amendes
> auxquelles **son préposé ou mandataire** a été condamné. »

Translation: "Without prejudice to specific provisions, the controller, the processor, **or their
representative in Belgium** is civilly liable for payment of the fines to which **their employee or
agent** has been sentenced."

**Scope — read this carefully, it matters:**

- This is a _vicarious / civil-party-liable_ provision (a long-standing Belgian criminal-law device:
  `civilement responsable`). The representative is made civilly liable for fines imposed on
  **their own `préposé ou mandataire`** (employee or agent) — NOT automatically for the foreign
  controller's own fines.
- ⚠️ This is therefore **materially narrower than Spain's LOPDGDD Art. 30**, which imposes
  _joint-and-several liability of the representative for the controller's own liability_.
- ⚠️ **UNVERIFIED / genuine ambiguity:** whether "son représentant en Belgique" in Art. 228 is meant
  as the **GDPR Art. 27** representative specifically, or is inherited drafting from the repealed
  1992 privacy law (which had its own "représentant en Belgique" concept for foreign controllers).
  The provision does not cross-reference GDPR Art. 27 expressly. A solo dev with no employees or
  agents in Belgium has, on the face of it, **nobody whose fines could attach** — the liability
  hook needs a `préposé ou mandataire` who has been criminally sentenced.

**Belgian penal fine ranges in the same chapter** (context, PRIMARY, same source):
Art. 222 €250–€15,000 · Art. 223 €500–€30,000 · Art. 224 €200–€10,000 ·
Art. 226 €100–€10,000 · Art. 227 €100–€20,000 · Art. 229 coordination between the APD and the
public prosecutor on administrative-vs-penal sanctioning.
(Note: Belgian penal fines are subject to statutory _décimes additionnels_ multipliers — the
figures in the text are not the amounts actually imposed.)

**Comparative position (from prior verified research, restated):**

| Country    | Provision                                                    | Effect on the representative                                                                                                 |
| ---------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 🇪🇸 Spain   | LOPDGDD Art. 30 (verified, BOE)                              | **Joint-and-several liability** for the controller's liability — avoid                                                       |
| 🇩🇪 Germany | §44(3) BDSG (verified, gesetze-im-internet.de)               | Rep is an **authorized recipient** in civil proceedings                                                                      |
| 🇧🇪 Belgium | **Loi 30/07/2018 Art. 228** (verified this session, PRIMARY) | Civilly liable for fines of **their own employee/agent** — narrow; no joint-and-several liability for the controller's fines |

**Bottom line on Belgium:** better than Spain, roughly comparable in seriousness to Germany's
procedural quirk. Not a clean "silent" jurisdiction, but the Art. 228 hook appears inapplicable to a
representative who has no employees or agents of their own.

### 1.2 What I actually searched (so the negative findings are worth something)

Per the brief: a negative finding is only worth as much as the search behind it. Searched:

- **jurion.fanc.fgov.be** (federal legal database) — full text of the Loi 30/07/2018, Title 6
  "Sanctions" (wettekstId 27607) and Chapter II "Sanctions pénales" (wettekstId 27610). ✅ loaded
- **ejustice.just.fgov.be / etaamb.openjustice.be / wallex.wallonie.be** — consolidated law text
  located; `etaamb` fetch failed (ECONNREFUSED), `ejustice` reachable via the search index.
- **autoriteprotectiondonnees.be** — searched for standalone APD/GBA guidance on Art. 27 reps.
- **gdprhub.eu** APD/GBA decisions — index shows decisions 37/2020, 135/2022, 137/2023, 46/2024.

**Negative findings, stated explicitly:**

1. ❌ **No standalone APD/GBA guidance document dedicated to Art. 27 representatives was found.**
   The Belgian DPA has not published a rep-specific guidance note comparable to what some other DPAs
   have. Confidence: medium-high.
2. ❌ **No Belgian provision imposing joint-and-several liability on an Art. 27 rep** for the
   controller's own fines was found — i.e. **Belgium has no Spain-style LOPDGDD Art. 30 equivalent.**
   Confidence: medium-high (I read the sanctions title in full; I did not read all 240+ articles).
3. ⚠️ **Art. 228 is the one hit** and it is real — so the answer to "is Belgium silent?" is
   **NO, but nearly**. The provision is narrow and probably inapplicable here.
4. **APD/GBA decision 37/2020 (Google)** — the Belgian DPA has engaged with Art. 27(4) substantively,
   stressing the rep's enforcement-bridge role. Not a rep-liability holding. Not read in full.

**Residual risk / what a lawyer should confirm:** the exact intended scope of "son représentant en
Belgique" in Art. 228, and whether Belgian doctrine reads it as reaching the GDPR Art. 27 rep.
This is the single open Belgian question and it is a ~30-minute question for a Belgian privacy lawyer.

### 1.3 Art. 27(3) — rep in Belgium while users are spread across the EU

**PRIMARY — GDPR Art. 27(3)** (regulation text):

> "The representative shall be established in one of the Member States where the data subjects,
> whose personal data are processed in relation to the offering of goods or services to them, or
> whose behaviour is monitored, are."

Note the indefinite article: **"one of"**. The text does not require a rep in every Member State
where data subjects are — one qualifying Member State suffices.

**PRIMARY — EDPB Guidelines 3/2018** (territorial scope, Art. 3), on the rep's location:

> "the criterion for the establishment of the representative in the Union is the location of the
> data subjects whose personal data are being processed"

> "the representative must remain **easily accessible for data subjects in Member States where it is
> not established** and where the services or goods are being offered or where the behaviour is
> being monitored"

And the EDPB's good-practice recommendation:

> "Where data subjects whose personal data are processed are located in one particular Member State,
> the EDPB recommends, as a good practice, that the representative is established in that same
> Member State."

⚠️ **Verification caveat, stated honestly:** the EDPB PDF could not be text-extracted by my tooling
(the fetch returned compressed binary; local PDF rendering unavailable — `pdftoppm` not installed).
The quotes above are as indexed from the EDPB's own PDF at
`https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf`.
The wording is consistent across sources and matches the brief's own recollection of p. 26.
**The substance is reliable; treat the exact page number as unconfirmed** and re-check the PDF
directly if the quote is going into anything official.

**ANSWER TO THE QUESTION: No, Art. 27(3) is NOT a problem for a Belgium-based rep.**

- Velanto has EU users including, presumably, Belgian users → **Belgium is validly "one of the
  Member States where the data subjects are."** That satisfies Art. 27(3) on its face.
- The EDPB's "same Member State" line is a **good-practice recommendation for the single-Member-State
  case only** — it does not bite when users are spread across the EU, which is Velanto's situation.
- The real obligation that follows is **accessibility**, not location: the rep must be _easily
  accessible_ to a data subject in Portugal or Poland as much as to one in Belgium. In practice that
  means a working email/postal contact published in the privacy policy and answered promptly.
  ⚠️ **Language is the practical trap.** The EDPB expects reps to be usable by data subjects across
  the Union. A friend in Belgium answering only in English/Ukrainian is a weaker posture than a
  vendor with multilingual intake — though for a small free platform whose UI language set is already
  known, this is a proportionate, manageable risk rather than a blocker.

### 1.4 ⚠️ The bigger issue with the friend option — NOT a Belgium problem

Belgium's law is not the main obstacle. The structural problems with appointing a friend are:

1. **Art. 27(4)+(5) + Recital 80**: the rep must be **mandated in writing** and can be **subject to
   enforcement proceedings** in the event of the controller's non-compliance. Recital 80: the rep
   "should be subject to enforcement proceedings in the event of non-compliance by the controller."
   This is an **EU-level** exposure that exists regardless of Belgium's national law. A friend takes
   on a real, personal, EU-wide legal role — not a favour.
2. **Reachability duty is continuous.** Holidays, job changes, moving out of Belgium (he's a
   Ukrainian citizen resident in Belgium — residency can change) all break compliance silently.
   If he leaves the EU, Velanto is instantly non-compliant with no notice.
3. **His address becomes public** in Velanto's privacy policy. That is a real personal cost.
4. **Record-keeping**: Art. 30(1) requires the rep to maintain the record of processing activities.
   That's an ongoing administrative duty, not a mailbox.
5. **No insurance, no continuity, no professional indemnity.** Vendors carry this; a friend does not.

**A friend is legally permissible in Belgium. The question is whether it is fair to the friend, and
whether it is operationally durable — on both counts a €375–€420/yr vendor is hard to beat.**

## PART 2 — Vendor pricing (Art. 27 EU-representative-as-a-service)

⚠️ All vendors below are **VENDOR** sources. Their pricing is fact; their legal commentary is marketing.

### Prighter — RETRIEVED ✅

Source: https://prighter.com/pricing (loaded 2026-07-16). Prices exclude VAT. No setup fee.

| Plan   | Annual      | Monthly equiv. |
| ------ | ----------- | -------------- |
| Growth | **€420/yr** | €35/mo         |
| Small  | €852/yr     | €71/mo         |
| Medium | €2,040/yr   | €170/mo        |
| Large  | €4,752/yr   | €396/mo        |

- Tier features are **not** broken out on the pricing page (tiers appear to scale by company size).
- Bundle discount "up to 40%" if combining multiple representative services (e.g. EU + UK rep).
- **No free tier.** No nonprofit/hobby tier advertised on this page.
- Relevant tier for Velanto: **Growth, €420/yr** (~€35/mo).

### EDPO — RETRIEVED ✅

Source: https://edpo.com/data-protection-representative-price/ (loaded 2026-07-16). Priced per employee band, billed monthly-paid-annually.

| Band               | Price                     |
| ------------------ | ------------------------- |
| **0–50 employees** | **€160/mo → ≈ €1,920/yr** |
| 51–250             | €270/mo (≈ €3,240/yr)     |
| 251–500            | €490/mo (≈ €5,880/yr)     |
| 500+               | tailored                  |

Included: unlimited data-subject requests, unlimited authority requests, ISO27001 record storage,
breach-notification assistance, compliance certificate, GDPR alerts.
Discounts: 10% on 2nd rep appointed, 20% on 3rd. **No free/nonprofit tier.**
Caveats quoted: _"Additional fees may apply in case of large-scale processing and/or processing of
sensitive data"_; _"The prices listed are indicative fees. We will tailor our fees to your company's
situation."_ Startups/very small companies are told to contact them for a custom quote — so the
€1,920 is a ceiling to negotiate from, not a fixed rate.

### GDPR-Rep.eu — RETRIEVED ✅ (notable finding)

`https://www.gdpr-rep.eu/` **301-redirects to `https://prighter.com/`**. GDPR-Rep.eu is
**not an independent vendor — it is Prighter.** Treat its pricing as identical to Prighter's above.
This matters: a naive "compare 5 vendors" exercise would double-count them.

### DataRep — PARTIALLY RETRIEVED ⚠️

Source: https://www.datarep.com/service/eu-gdpr-article-27-representative-service/ (loaded 2026-07-16).
DataRep **does not publish a price on its service page** — pricing is behind a "SHOP" page and is
_"based on the numbers of data subjects in the relevant jurisdictions, and whether special category
data is processed."_
What the page does state: **minimum annual appointment fee €100**; bespoke landing page €50 (for
base fees under €1,500); renewal discounts 10–50% scaled to how few requests you generate.
Search index suggests "from €150/year" but **I did not load a page showing that number — treat the
headline annual price as NOT RETRIEVED**.

### Instant EU GDPR Representative — NOT RETRIEVED ❌

`www.instantgdprrepresentative.eu` → **DNS failure (ENOTFOUND)**. The domain does not resolve.
Possibly defunct or renamed. **Price not retrieved.** Do not rely on any figure for this vendor.

### Other options found while searching (prices from vendor pages I loaded)

| Vendor                                                                                                                                                                                                      | Price                                                                                                                                                                                                                         | Source loaded?                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **EU Business Partners** (article27representative.eu) — "Essentials" tier: ≤€4.9m revenue, ≤50 employees, 3 group entities, 3 domains, unlimited priority support, 30-day money-back                        | **€83/mo paid annually ≈ €996/yr** (or €97/mo monthly)                                                                                                                                                                        | ✅ https://article27representative.eu/en-us/pricing/              |
| **Obsecom** — $0–5m turnover band. Includes Art. 27 rep + "authorized recipient status for civil proceedings" + platform + legal library. Auto-renewing. **"This offer is for commercial customers only."** | **€375/yr**                                                                                                                                                                                                                   | ✅ https://en.obsecom.eu/eu-representative-costs-and-application/ |
| Engage Compliance                                                                                                                                                                                           | "From €59/mo" (≈€708/yr) — self-declared on a comparison page they publish themselves, and they **explicitly acknowledge their own bias**: _"We are one of the providers compared on this page and we acknowledge our bias."_ | ⚠️ vendor's own comparison page                                   |
| GDPR Local                                                                                                                                                                                                  | £99/mo per search index                                                                                                                                                                                                       | ❌ price not retrieved                                            |
| VeraSafe / Formiti                                                                                                                                                                                          | custom-scoped quotes only                                                                                                                                                                                                     | ❌ price not retrieved                                            |
| EU Rep (eurep.ie)                                                                                                                                                                                           | €19/mo + €99 one-off sign-up per search index                                                                                                                                                                                 | ❌ price not retrieved                                            |

### Free / nonprofit tiers

- **No mainstream vendor advertises a free tier.** Prighter, EDPO, EU Business Partners and Obsecom
  all confirmed **no free tier** on pages I loaded.
- `data-privacy-office.eu` advertises a _"Free stand-by EU representative service under GDPR"_ —
  **HTTP 403, could not load, terms UNVERIFIED.** A "stand-by" free rep almost certainly means
  free designation with per-request charges once a data subject or DPA actually contacts them,
  which is exactly when you need it. **Do not rely on this without reading the terms.**
- Obsecom's _"commercial customers only"_ line is a reminder that a free/hobby project may be
  **out of scope** for some vendors rather than cheaper.

### Realistic price band for Velanto

A solo dev, free platform, no special-category data at scale, <50 "employees" sits in every vendor's
smallest tier: **≈ €375 – €1,920/yr**, with **Prighter €420/yr** and **Obsecom €375/yr** as the
cheapest _verified published_ prices, and **EDPO ≈€1,920/yr** the priciest of the majors (but openly
negotiable). The often-quoted "€600–€2,400/yr" market range is consistent with this.

## PART 3 — Enforcement reality

### 3.1 Locatefamily.com — VERIFIED ✅ (the prior agent's recollection was CORRECT)

The Dutch DPA (Autoriteit Persoonsgegevens) **did** fine Locatefamily.com **€525,000** for failing
to designate an Art. 27 EU representative. This is confirmed by the AP's own website and by the
EDPB's national-news listing.

Primary/official source pages (located, titles+substance confirmed via search index; direct fetch of
the AP English page returned HTTP 403 to the fetch tool — see caveat below):

- AP press release (NL): https://www.autoriteitpersoonsgegevens.nl/nl/nieuws/boete-van-525000-euro-voor-locatefamilycom
- AP press release (EN): https://www.autoriteitpersoonsgegevens.nl/en/current/dutch-dpa-imposes-fine-of-eu525000-on-locatefamilycom
- **AP decision document**: https://www.autoriteitpersoonsgegevens.nl/documenten/boete-locatefamilycom
- EDPB national news: https://www.edpb.europa.eu/news/national-news/2021/dutch-dpa-imposes-fine-eu525000-locatefamilycom_en

Established facts:

- **Fine: €525,000**, decision **12 May 2021** (published/announced May 2021).
- **Breach: GDPR Art. 27** — no representative in the EU. Believed to be the **first** DPA fine
  anywhere in the EU purely for an Art. 27 failure.
- Locatefamily.com publishes people's addresses/phone numbers, frequently without their knowledge;
  the absence of an EU rep made it **practically impossible for data subjects to get data erased** —
  this was the AP's stated harm rationale.
- **Penalty order (last onder dwangsom) on top of the fine**: designate an EU rep by **18 March 2021**
  or pay **€20,000 per 2 weeks** of continued non-compliance, capped at **€120,000**.
- The AP cooperated with **9 other European DPAs plus the Canadian** privacy regulator.

⚠️ **Fetch caveat (honesty note):** `autoriteitpersoonsgegevens.nl` returned **HTTP 403** to the
automated fetch tool, and gdprhub.eu was behind an anti-bot wall. The facts above come from the
search engine's index of the AP's own pages plus consistent reporting by Bird & Bird, Hunton,
Wilson Sonsini, Fasken, and the IAPP. The AP URLs are real and are the right place to read the
decision itself — **a human should open the decision PDF to confirm before relying on the detail.**
Confidence: **high on the headline (fine, amount, Art. 27, 2021)**, medium on the fine detail.

### 3.2 Is the enforcement record otherwise thin? — **YES, it is thin. This is a real finding.**

**PRIMARY — GDPR Art. 83(4)(a):** an Art. 27 infringement sits in the **lower** fine tier —
up to **€10m or 2% of worldwide annual turnover**, whichever is higher (not the 4% tier).
For a free platform with ~zero turnover, the turnover limb is meaningless and any fine would be
assessed against the €10m ceiling using Art. 83(2) proportionality factors (nature, gravity,
duration, intentional/negligent, mitigation, categories of data, cooperation). Velanto scores
favourably on essentially every one of those factors.

**Other cases located:**

- **Clearview AI — Italy (Garante), €600,000 attributed to the Art. 27 failure** within a much larger
  action (the total Italian Clearview fine was €20m). ⚠️ **SECONDARY only** — I did not load the
  Garante decision. Treat the €600k Art.-27-specific attribution as **UNVERIFIED**. The salient point
  stands either way: Art. 27 was a **secondary count bolted onto a serious primary violation**
  (Clearview scraped biometric data of millions without any lawful basis).
- **No other standalone Art. 27 fine was located.** Searched 2022–2026.

**The honest read of the enforcement record:**

1. **Locatefamily.com (2021) appears to remain the ONLY fine anywhere in the EU imposed _purely_
   for an Art. 27 failure** — and it is now **five years old**. Commentators at the time called it
   the first; nothing found since displaces it as the only one.
2. **Both known cases involve egregious underlying conduct**, not the Art. 27 gap in isolation:
   - Locatefamily: publishing people's home addresses and phone numbers without their knowledge
     **and ignoring erasure requests**. The missing rep was the _mechanism of the harm_ — it's what
     made the company unreachable for the erasure requests it was already refusing.
   - Clearview: mass biometric scraping.
     → **Neither is a "we just forgot to appoint a rep" case.** In both, the DPA was already
     investigating something serious and Art. 27 was an aggravating add-on.
3. **The realistic pattern for a small compliant operator is: complaint → DPA contact → order to
   designate → fine only if you ignore the order.** Note that even Locatefamily got a _penalty
   order with a deadline_ (18 March 2021) alongside the fine — the DPA's instinct is to compel
   compliance first.
4. ⚠️ **Vendor marketing systematically misrepresents this.** Vendor pages cite Locatefamily's
   €525,000 and Art. 83(4)'s €10m ceiling as if they were the expected cost of non-designation for
   any company. They are not: one is a five-year-old outlier against a bad actor, the other is a
   statutory maximum. The brief's instinct to distrust vendor content is **confirmed and warranted**.
   (Even the "independent" comparison site I found — engagecompliance.co — is published by a vendor
   who admits their own bias in the page text.)

**What this does NOT mean:** the obligation is still real and already established as applicable.
Non-designation is a live, ongoing breach that a single complaint from one annoyed user can surface,
and it looks bad in exactly the moment you least want it to (a DSAR dispute, a breach, an
acquisition, a partner's due diligence). But the **expected near-term financial exposure for a small,
otherwise-compliant free platform that responds to a DPA promptly is realistically ≈ €0** — the
tail risk is regulatory friction and forced remediation, not a €525k invoice.

---

## SUMMARY & RECOMMENDATION

### The three questions, answered

**1. Does Belgium have a Spain-style trap?** **No — but it is not perfectly silent either.**
`Loi du 30 juillet 2018, Art. 228` makes "le responsable du traitement, le sous-traitant, ou son
représentant en Belgique" **civilement responsable** for fines imposed on **their own employee or
agent**. That is far narrower than Spain's joint-and-several liability and has no obvious application
to a solo rep with no staff. **Belgium is an acceptable jurisdiction — clearly better than Spain,
about on par with Germany.** One open question for a Belgian lawyer: does Art. 228's "représentant en
Belgique" mean the Art. 27 rep, or is it inherited 1992-law drafting?

**2. Does Art. 27(3) break the Belgium plan?** **No.** "**one of** the Member States where the data
subjects are" — Belgium qualifies as long as Velanto has Belgian users. The EDPB's "same Member
State" line is good practice for the _single_-Member-State case, which isn't Velanto's. The binding
duty is that the rep stay **"easily accessible for data subjects in Member States where it is not
established"** — an accessibility/language duty, not a location bar.

**3. Vendor prices?** Cheapest verified published: **Obsecom €375/yr** (⚠️ "commercial customers
only" — a free platform may not qualify) and **Prighter €420/yr** (no such restriction).
**EU Business Partners ≈€996/yr**, **EDPO ≈€1,920/yr** (openly negotiable for small companies).
**DataRep and Instant EU GDPR Rep: price not retrieved** (the latter's domain doesn't even resolve).
**GDPR-Rep.eu is Prighter** — same company, don't double-count. **No genuine free tier exists.**

### Recommendation: **use Prighter (€420/yr), not the friend.**

The decision does **not** turn on Belgian law — Belgium is fine. It turns on this:

- **The friend option is legally available but costs someone else something real.** Under Art. 27(5)
  and Recital 80 he'd be personally subject to enforcement proceedings for Velanto's non-compliance,
  his home address would go in the privacy policy, and he'd owe an ongoing Art. 30 record-keeping
  duty and continuous reachability. That's not a favour you ask of a friend for a free side project.
- **It is operationally brittle.** He is a Ukrainian citizen _resident_ in Belgium. If his residency
  or country changes, Velanto silently becomes non-compliant with zero notice — a failure mode with
  no monitoring and no alarm.
- **€420/yr ≈ €35/month makes the whole question go away**, with continuity, multilingual intake
  (which is what actually satisfies the EDPB accessibility duty across a pan-EU userbase), and no
  personal exposure for anyone.

**If €420/yr is genuinely not affordable right now**, the honest risk read from Part 3 is that the
near-term enforcement exposure is very low (one 5-year-old fine, against a bad actor, in the lower
Art. 83(4) tier, with DPAs preferring compel-first orders). That is an argument for **sequencing** —
appoint before/at public launch rather than today — **not** an argument for never doing it, and not
an argument for pushing the liability onto a friend to save the fee.

### Suggested next steps

1. **Don't ask the friend.** (Or if you do, tell him about Recital 80 and Art. 228 first — informed
   consent, not a favour.)
2. **Check whether Prighter's Growth tier accepts a free/non-commercial platform** — Obsecom's
   "commercial customers only" clause shows this is a live question. Ask before paying.
3. Budget **€420/yr**; appoint at or before public launch.
4. Once appointed: publish the rep's identity + contact in `/privacy` (Art. 13(1)(a) requires it) and
   make sure the Art. 30 record of processing exists — the rep must maintain it.
5. **One question for a Belgian privacy lawyer if the friend route is ever revisited:** the scope of
   "son représentant en Belgique" in Art. 228 of the Loi du 30 juillet 2018.
6. Ties into existing launch blocker **issue #204** (legal review of /terms + /privacy before public
   launch) — fold the Art. 27 rep designation into that same review.

---

## Source appendix

**PRIMARY (loaded and read):**

- Belgian Loi du 30 juillet 2018, Title 6 "Sanctions" — https://www.jurion.fanc.fgov.be/jurdb-consult/plainWettekstServlet?wettekstId=27607&lang=fr
- Belgian Loi du 30 juillet 2018, Ch. II "Sanctions pénales" (**Art. 228**) — https://www.jurion.fanc.fgov.be/jurdb-consult/plainWettekstServlet?wettekstId=27610&lang=fr
- Consolidated law text — https://www.ejustice.just.fgov.be/eli/loi/2018/07/30/2018040581/justel

**PRIMARY (located; quotes via search index, direct extraction blocked — see caveats):**

- EDPB Guidelines 3/2018 on territorial scope — https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf _(PDF text extraction failed)_
- Dutch DPA press release, Locatefamily.com — https://www.autoriteitpersoonsgegevens.nl/en/current/dutch-dpa-imposes-fine-of-eu525000-on-locatefamilycom _(HTTP 403 to fetch tool)_
- **Dutch DPA decision document** — https://www.autoriteitpersoonsgegevens.nl/documenten/boete-locatefamilycom _(not read — read this if the detail matters)_
- EDPB national news, Locatefamily — https://www.edpb.europa.eu/news/national-news/2021/dutch-dpa-imposes-fine-eu525000-locatefamilycom_en

**VENDOR (pricing loaded — pricing is fact, legal commentary is marketing):**

- Prighter — https://prighter.com/pricing ✅
- EDPO — https://edpo.com/data-protection-representative-price/ ✅
- EU Business Partners — https://article27representative.eu/en-us/pricing/ ✅
- Obsecom — https://en.obsecom.eu/eu-representative-costs-and-application/ ✅
- DataRep — https://www.datarep.com/service/eu-gdpr-article-27-representative-service/ ⚠️ no price published
- Engage Compliance "comparison" — https://www.engagecompliance.co/eu-representative-providers-compared ⚠️ self-admitted bias

**NOT RETRIEVED / dead:**

- Instant EU GDPR Representative — domain does not resolve (ENOTFOUND)
- data-privacy-office.eu "free stand-by EU rep" — HTTP 403, terms UNVERIFIED
- gdprhub.eu — anti-bot wall

**SECONDARY (corroboration only):** Bird & Bird, Hunton, Wilson Sonsini, Fasken, Taylor Wessing,
IAPP commentary on Locatefamily; IAPP on Clearview/Art. 27.

---

## STATUS: COMPLETE
