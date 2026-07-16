# DSA (Reg. (EU) 2022/2065) — applicability to Velanto

Research date: 2026-07-16. Primary text retrieved from the EU Publications Office cellar endpoint
(`http://publications.europa.eu/resource/celex/32022R2065`, `Accept: application/xhtml+xml`,
`Accept-Language: eng` — this is the authentic OJ text; EUR-Lex HTML blocks bots, the cellar does not).
All quotes below marked **PRIMARY** are verbatim from that retrieval.

## 0. Bottom line

**The DSA binds Velanto.** Velanto is a hosting service and an **online platform**. Because Velanto is a
micro enterprise, Art. 19 exempts it from most of the heavy platform obligations (Section 3), but the
following **survive**: Art. 11–15 (incl. **Art. 14 terms and conditions**), **Art. 16 notice and action**,
**Art. 17 statement of reasons**, Art. 18, and **Art. 24(3)**. Also survives: **Art. 13 legal
representative** (a second one, distinct from GDPR Art. 27 — but the same person may hold both).

---

## 1. Territorial scope (Art. 2) — DSA applies despite no EU establishment

**PRIMARY — Art. 2(1):**

> "This Regulation shall apply to intermediary services offered to recipients of the service that have
> their place of establishment or are located in the Union, **irrespective of where the providers of those
> intermediary services have their place of establishment**."

**PRIMARY — Art. 2(2):** "This Regulation shall not apply to any service that is not an intermediary
service…"

So: no EU establishment is irrelevant. Bright-line rule — DSA applies.

### "Substantial connection to the Union" — the test

**PRIMARY — Art. 3(d):** "'**to offer services in the Union**' means enabling natural or legal persons in
one or more Member States to use the services of a provider of intermediary services that has a
substantial connection to the Union;"

**PRIMARY — Art. 3(e):**

> "'**substantial connection to the Union**' means a connection of a provider of intermediary services with
> the Union resulting **either from its establishment in the Union or from specific factual criteria, such
> as**:
> — a significant number of recipients of the service in one or more Member States in relation to its or
> their population; **or**
> — **the targeting of activities towards one or more Member States**;"

**Application to Velanto (judgment call, but an easy one):** Velanto has zero users today, so the
"significant number of recipients" limb is not met. But the limbs are **disjunctive ("or")** and the list
is **non-exhaustive ("such as")**. Velanto ships its **UI in 11 languages** (EU languages among them) and
is aimed at EU users — that is **targeting of activities towards one or more Member States**.

**PRIMARY — Recital 8 (verified verbatim; recitals are interpretive, not operative, but authoritative as to
intent):**

> "The **targeting of activities** towards one or more Member States can be determined on the basis of all
> relevant circumstances, including factors such as **the use of a language** or a currency generally used
> in that Member State, or the possibility of ordering products or services, or **the use of a relevant
> top-level domain**. The targeting … could also be derived from the availability of an application in the
> relevant national application store, from the provision of local advertising or advertising in a language
> used in that Member State, or from the handling of customer relations such as by providing **customer
> service in a language generally used in that Member State**. … **In contrast, mere technical
> accessibility** [of a website from the Union should not, on that ground alone, be considered as
> establishing a substantial connection]."

→ Velanto's **11-language UI** hits the "use of a language generally used in that Member State" factor
squarely, and the in-app support/feedback flows hit "handling of customer relations … in a language
generally used in that Member State". Velanto is well past "mere technical accessibility".

→ **Velanto has a substantial connection to the Union and offers services in the Union. DSA applies.**
The only realistic way out would be to genuinely not target the EU (no EU-language UI, no EU users) — which
contradicts the product's stated intent.

### Art. 13 — legal representative (BRIGHT-LINE, APPLIES)

**PRIMARY — Art. 13(1):**

> "Providers of intermediary services which do not have an establishment in the Union but which offer
> services in the Union **shall designate, in writing, a legal or natural person to act as their legal
> representative in one of the Member States where the provider offers its services**."

**PRIMARY — Art. 13(2):** the representative is mandated "for the purpose of being addressed in addition
to or instead of such providers, by the Member States' competent authorities, the Commission and the
Board, on all issues necessary for the receipt of, compliance with and enforcement of decisions issued in
relation to this Regulation." The provider must give it "necessary powers and sufficient resources".

**PRIMARY — Art. 13(3):** "It shall be possible for the designated legal representative to be **held
liable** for non-compliance with obligations under this Regulation, without prejudice to the liability and
legal actions that could be initiated against the provider…"

**PRIMARY — Art. 13(4):** must notify "the name, postal address, email address and telephone number of
their legal representative to the **Digital Services Coordinator in the Member State where that legal
representative resides or is established**" and "ensure that that information is **publicly available,
easily accessible, accurate and kept up to date**."

**PRIMARY — Art. 13(5):** "The designation of a legal representative within the Union pursuant to
paragraph 1 shall **not constitute an establishment in the Union**."

**Note — Art. 13 is in Chapter III Section 1, NOT Section 3, so Art. 19 does NOT exempt it.**
Micro-enterprise status gives no relief here.

**Same person as the GDPR Art. 27 representative?** — see §2/§8 below.

---

## 2. Classification (Art. 3) — Velanto is an ONLINE PLATFORM. Confirmed.

**PRIMARY — Art. 3(g)(iii):** "'intermediary service' means one of the following information society
services: … (iii) a '**hosting**' service, consisting of the **storage of information provided by, and at
the request of, a recipient of the service**;"

**PRIMARY — Art. 3(i):**

> "'**online platform**' means a hosting service that, at the request of a recipient of the service,
> **stores and disseminates information to the public**, unless that activity is a minor and purely
> ancillary feature of another service or a minor functionality of the principal service and, for objective
> and technical reasons, cannot be used without that other service, and the integration of the feature or
> functionality into the other service is not a means to circumvent the applicability of this Regulation;"

**PRIMARY — Art. 3(k):** "'**dissemination to the public**' means making information available, at the
request of the recipient of the service who provided the information, to a **potentially unlimited number
of third parties**;"

**PRIMARY — Art. 3(t) content moderation** (note how wide): "the activities, whether automated or not …
aimed … at detecting, identifying and addressing illegal content or **information incompatible with their
terms and conditions** … including measures taken that affect the availability, visibility, and
accessibility … such as demotion, demonetisation, disabling of access to, or removal thereof, or that
affect the ability of the recipients … such as the **termination or suspension of a recipient's account**;"

**PRIMARY — Art. 3(u) terms and conditions:** "all clauses, **irrespective of their name or form**, which
govern the contractual relationship between the provider … and the recipients of the service".

**PRIMARY — Art. 3(s) recommender system:** "a fully or partially automated system used by an online
platform to suggest … specific information … or **prioritise** that information, including as a result of a
**search initiated by the recipient** … or otherwise **determining the relative order or prominence** of
information displayed". → Velanto's home-feed sort (Popular/Date/Relevance) **is a recommender system**.
Art. 27 (recommender transparency) is nevertheless exempt under Art. 19; but Art. 14(1) still forces
disclosure of algorithmic decision-making _used for content moderation_ (see §4).

**PRIMARY — Art. 3(r) advertisement:** requires presentation "**against remuneration**". Velanto has no
ads → Art. 26 moot regardless of Art. 19.

**Conclusion (bright-line):** Velanto stores user-authored packs, comments, images and YouTube links at
users' request (hosting, Art. 3(g)(iii)) and publishes them to a public feed viewable by a potentially
unlimited number of third parties (dissemination to the public, Art. 3(k)). Dissemination is **the whole
point of the product**, not "minor and purely ancillary" — the carve-out in Art. 3(i) does not bite.
**Velanto = intermediary service + hosting service + online platform.** The task's hypothesis is confirmed,
not refuted.

Not a marketplace (no traders/consumer contracts) → Section 4 (Arts. 29–32) does not apply.
Not a VLOP (needs 45m average monthly active EU recipients, Art. 33(1)) → Section 5 does not apply, and
the Art. 19(2) derogation does not bite.

## 3. Art. 19 micro/small exemption — EXACT SCOPE

**PRIMARY — Art. 19(1):**

> "**This Section, with the exception of Article 24(3) thereof, shall not apply to providers of online
> platforms that qualify as micro or small enterprises as defined in Recommendation 2003/361/EC.**
>
> This Section, with the exception of Article 24(3) thereof, shall not apply to providers of online
> platforms that previously qualified for the status of a micro or small enterprise as defined in
> Recommendation 2003/361/EC during the 12 months following their loss of that status pursuant to Article
> 4(2) thereof, except when they are very large online platforms in accordance with Article 33."

**PRIMARY — Art. 19(2):** "By derogation from paragraph 1 of this Article, this Section shall apply to
providers of online platforms that have been designated as very large online platforms in accordance with
Article 33, irrespective of whether they qualify as micro or small enterprises."

**"This Section" = Chapter III, Section 3** ("Additional provisions applicable to providers of online
platforms") = **Articles 19–28**. Therefore:

| Article                                         | Section          | Exempt for micro?                                            |
| ----------------------------------------------- | ---------------- | ------------------------------------------------------------ |
| Art. 11 points of contact (authorities)         | III §1           | **NO — applies**                                             |
| Art. 12 point of contact (recipients)           | III §1           | **NO — applies**                                             |
| Art. 13 legal representative                    | III §1           | **NO — applies**                                             |
| **Art. 14 terms and conditions**                | III §1           | **NO — APPLIES**                                             |
| Art. 15 transparency reporting (intermediaries) | III §1           | applies _unless_ micro/small — Art. 15(2) carve-out (verify) |
| **Art. 16 notice and action**                   | III §2 (hosting) | **NO — APPLIES**                                             |
| **Art. 17 statement of reasons**                | III §2 (hosting) | **NO — APPLIES**                                             |
| Art. 18 notification of criminal offences       | III §2 (hosting) | **NO — applies**                                             |
| Art. 20 internal complaint-handling             | III §3           | **YES — exempt**                                             |
| Art. 21 out-of-court dispute settlement         | III §3           | **YES — exempt**                                             |
| Art. 22 trusted flaggers                        | III §3           | **YES — exempt**                                             |
| Art. 23 measures against misuse                 | III §3           | **YES — exempt**                                             |
| Art. 24(1)(2) platform transparency reporting   | III §3           | **YES — exempt**                                             |
| **Art. 24(3)**                                  | III §3           | **NO — expressly carved back IN**                            |
| Art. 25 dark patterns / interface design        | III §3           | **YES — exempt**                                             |
| Art. 26 advertising transparency                | III §3           | **YES — exempt** (moot: no ads)                              |
| Art. 27 recommender transparency                | III §3           | **YES — exempt**                                             |
| Art. 28 protection of minors                    | III §3           | **YES — exempt** (but see note)                              |

**Section boundaries VERIFIED PRIMARY from the OJ text** (the section headings appear inline in the
authentic text): the heading "SECTION 2 — Additional provisions applicable to providers of hosting
services, including online platforms" falls **after Art. 15** and before Art. 16; the heading "SECTION 3 —
Additional provisions applicable to providers of online platforms" falls **after Art. 18** and before Art. 19. So Section 2 = Arts. 16–18; Section 3 = Arts. 19–28. **Art. 16 and Art. 17 are NOT in Section 3 and
are therefore NOT exempted by Art. 19.** This is the single most important finding in this document.

### Answering the task's checklist precisely

| Asked                                   | Survives for a micro enterprise? |
| --------------------------------------- | -------------------------------- |
| Art. 14 terms and conditions            | **YES, SURVIVES** (Section 1)    |
| Art. 16 notice and action               | **YES, SURVIVES** (Section 2)    |
| Art. 17 statement of reasons            | **YES, SURVIVES** (Section 2)    |
| Art. 20 internal complaint-handling     | **NO — exempt** (Section 3)      |
| Art. 21 out-of-court dispute settlement | **NO — exempt** (Section 3)      |
| Art. 23 measures against misuse         | **NO — exempt** (Section 3)      |
| Art. 24 transparency reporting          | **exempt EXCEPT Art. 24(3)**     |

### Art. 15 — separate, independent micro carve-out (do not confuse with Art. 19)

**PRIMARY — Art. 15(2):** "Paragraph 1 of this Article shall **not apply to providers of intermediary
services that qualify as micro or small enterprises** as defined in Recommendation 2003/361/EC and which
are not very large online platforms within the meaning of Article 33 of this Regulation."

→ Velanto owes **no annual transparency report** — via Art. 15(2) itself, not via Art. 19.

### Art. 24(3) — the one Section 3 duty that survives

**PRIMARY — Art. 24(3):** "Providers of online platforms or of online search engines shall **communicate to
the Digital Services Coordinator of establishment and the Commission, upon their request and without undue
delay, the information referred to in paragraph 2** [average monthly active recipients in the Union],
updated to the moment of such request. That Digital Services Coordinator or the Commission may require the
provider … to provide additional information as regards the calculation … That information shall **not
include personal data**."

**Nuance worth noting:** Art. 24(2) (the duty to _publish_ active-recipient counts every 6 months) **is**
exempt for micro; Art. 24(3) (the duty to _hand the same number over on request_) is **not**. So Velanto
must be able to compute average monthly active EU recipients on demand, but need not publish it. Purpose is
obvious: it's the VLOP-threshold tripwire. **Practical implication: keep the ability to produce that
number.** Nothing to put in the ToS.

### Micro-enterprise qualification (Recommendation 2003/361/EC)

Micro = **< 10 staff AND** (turnover **≤ €2m** OR balance-sheet total ≤ €2m). Velanto = one unpaid person,
no revenue. Qualifies with enormous headroom. **SECONDARY/UNVERIFIED as to the exact Recommendation text —
not fetched in this run; the thresholds above are well-established but were not read from the primary
source here.** Caveat: the Recommendation's "linked/partner enterprise" rules aggregate group figures —
irrelevant for a solo operator with no corporate group.

⚠️ **Art. 19 is a status, not a permanent state.** If Velanto grows past micro/small, Section 3 (Arts. 20,
21, 23, 25, 27, 28…) switches on after a 12-month grace period (Art. 19(1) subpara. 2). Design the
moderation stack so complaint-handling can be added without a rewrite.

⚠️ **Art. 28 (protection of minors)** is in Section 3 and so is exempt on the text — but this is the least
comfortable exemption to rely on given a quiz platform plausibly attractive to minors, and **Art. 14(3)
(Section 1, NOT exempt) independently applies**: "Where an intermediary service is primarily directed at
minors or is predominantly used by them, the provider … shall explain the conditions for, and any
restrictions on, the use of the service **in a way that minors can understand**." Judgment call: if Velanto
is not primarily directed at minors, Art. 14(3) does not bite.

---

## 4. Art. 14 — terms and conditions (APPLIES, no exemption)

**PRIMARY — Art. 14(1):**

> "Providers of intermediary services shall include information on **any restrictions that they impose in
> relation to the use of their service in respect of information provided by the recipients of the
> service**, in their terms and conditions. That information shall include information on **any policies,
> procedures, measures and tools used for the purpose of content moderation, including algorithmic
> decision-making and human review, as well as the rules of procedure of their internal complaint handling
> system**. It shall be set out in **clear, plain, intelligible, user-friendly and unambiguous language**,
> and shall be **publicly available in an easily accessible and machine-readable format**."

**PRIMARY — Art. 14(2):** "Providers … shall **inform the recipients of the service of any significant
change** to the terms and conditions."

**PRIMARY — Art. 14(4):** "Providers … shall act in a **diligent, objective and proportionate manner** in
applying and enforcing the restrictions referred to in paragraph 1, **with due regard to the rights and
legitimate interests of all parties involved, including the fundamental rights of the recipients**, such as
the freedom of expression, freedom and pluralism of the media, and other fundamental rights … as enshrined
in the Charter."

Art. 14(5) and 14(6) (summary; ToS in all official languages) bind **VLOPs only** — not Velanto.

### What Velanto's ToS must actually say — concrete checklist

1. **The restrictions themselves.** What content is not allowed (illegal content, hate/slurs — the existing
   filter, whatever the pack rules are). Velanto's `domain-rules.md` prose is _not_ the ToS.
2. **The moderation queue.** State plainly: packs are **reviewed before going live**; approval is required;
   **trusted/staff authors bypass review** — this asymmetry is a "policy … used for the purpose of content
   moderation" and must be disclosed, not hidden.
3. **The tools.** Disclose the **automated hate/slur filter** explicitly — Art. 14(1) names "**algorithmic
   decision-making**" and Velanto has one. Say whether it blocks automatically or only flags for human
   review, and say that **human review** by staff follows.
4. **Rejection.** That packs can be **rejected with a reason**, and that the author is told the reason.
5. **Bans.** The grounds on which an account can be **banned/suspended**, and that a reason is given.
6. **Reports.** That anyone can report content, and what happens next (→ Art. 16, §6 below).
7. **Internal complaint handling — nuance.** Art. 14(1) requires "the rules of procedure of their internal
   complaint handling system". Art. 20 (the _duty to have_ an Art. 20-compliant system) is **exempt**. Best
   reading: **if you have no internal complaint system, there are no rules of procedure to publish** — the
   Art. 14(1) clause is descriptive of what you have, not a back-door imposition of Art. 20 on micro
   enterprises (which would render Art. 19's exemption of Art. 20 meaningless — _effet utile_). **This is a
   judgment call, SECONDARY reasoning, not a bright-line rule.** But note: Art. 15(1)(d) refers to
   complaints received "in accordance with the **provider's terms and conditions** and _additionally_, for
   providers of online platforms, in accordance with Article 20" — the Regulation clearly contemplates
   ToS-based complaint systems existing independently of Art. 20. **Recommendation:** offer a lightweight
   "reply to this decision" contact route anyway (cheap; Art. 17(3)(f) needs _something_ to point at), and
   describe it honestly without over-promising Art. 20 timelines.
8. **Form.** Clear/plain/intelligible/user-friendly/unambiguous; publicly available; **machine-readable
   format**. A normal server-rendered HTML page at `/terms` satisfies "machine-readable" on the ordinary
   reading (text, not an image/scanned PDF). **UNVERIFIED**: no Commission guidance located in this run
   defining "machine-readable" for Art. 14(1).
9. **Change notice.** Build a mechanism to notify users of significant ToS changes (Art. 14(2)) — currently
   likely absent.
10. **Language.** Art. 14(6) (all official languages) is VLOP-only, so the 11-language UI is a _bonus_, not
    a duty. But "clear, plain, intelligible" is assessed against **the users you target**. Since the ToS are
    already machine-translated into 11 languages, note the existing launch-blocker (FE issue #204, lawyer
    review) applies with extra force here: a bad machine translation of a moderation policy is an Art. 14(1)
    compliance risk, not just a polish issue.

**Interaction with the existing legal-pages work:** the `/terms` page (FE #203) was written as a generic
AI template. A generic template **will not contain** items 2–6 above. This is a real, identified gap.

---

## 5. Art. 17 — statement of reasons (APPLIES, no exemption)

**PRIMARY — Art. 17(1):** "Providers of hosting services shall provide a **clear and specific statement of
reasons to any affected recipients** of the service for any of the following restrictions imposed on the
ground that the information provided by the recipient of the service is illegal content or **incompatible
with their terms and conditions**:
(a) any restrictions of the visibility of specific items of information …, including **removal of content,
disabling access to content, or demoting content**;
(b) suspension, termination or other restriction of monetary payments;
(c) suspension or termination of the provision of the service in whole or in part;
(d) **suspension or termination of the recipient of the service's account**."

**PRIMARY — Art. 17(2):** "Paragraph 1 shall **only apply where the relevant electronic contact details are
known to the provider**. It shall apply **at the latest from the date that the restriction is imposed**,
regardless of why or how it was imposed. … shall not apply where the information is deceptive high-volume
commercial content."

**PRIMARY — Art. 17(3) — the mandatory contents:**

> "(a) information on **whether the decision entails** either the removal of, the disabling of access to,
> the demotion of or the restriction of the visibility of the information, or … other measures …, and,
> where relevant, **the territorial scope of the decision and its duration**;
> (b) **the facts and circumstances relied on** in taking the decision, including, where relevant,
> information on whether the decision was taken **pursuant to a notice submitted in accordance with Article
> 16** or based on **voluntary own-initiative investigations** and, where strictly necessary, the identity
> of the notifier;
> (c) where applicable, information on the **use made of automated means** in taking the decision, including
> information on whether the decision was taken in respect of content **detected or identified using
> automated means**;
> (d) where the decision concerns allegedly illegal content, a **reference to the legal ground** relied on
> and explanations as to why the information is considered to be illegal content on that ground;
> (e) where the decision is based on the alleged **incompatibility … with the terms and conditions**, a
> **reference to the contractual ground** relied on and explanations as to why …;
> (f) **clear and user-friendly information on the possibilities for redress** available to the recipient …
> in particular, where applicable through internal complaint-handling mechanisms, out-of-court dispute
> settlement and **judicial redress**."

**PRIMARY — Art. 17(4):** "…shall be clear and easily comprehensible and **as precise and specific as
reasonably possible** … such as to reasonably allow the recipient … to effectively exercise the
possibilities for redress …"

**PRIMARY — Art. 17(5):** "This Article shall **not apply to any orders referred to in Article 9**."

### Is Velanto's `rejectionReason` + ban reason enough? **NO.**

A free-text `rejectionReason` string covers **Art. 17(3)(b)** (facts/circumstances) and _maybe_ **(e)** if
the moderator happens to cite the rule. It **misses**:

- **(a)** — the nature/**duration** of the measure. A ban in particular needs **duration** stated
  (permanent vs temporary). Velanto's ban has a reason but (per the task description) no structured
  duration/territorial-scope field surfaced to the user.
- **(c)** — **whether automated means were used**. Velanto has an automated hate/slur filter. If that filter
  contributed to a rejection, the statement **must say so**. This is very likely **not** currently recorded
  — it needs a flag on the decision (`automatedDetection: boolean`) and rendering in the notice.
- **(d)/(e)** — a **structured reference to the ground** (legal ground for illegal content; **contractual
  ground / specific ToS clause** otherwise). Free text ≠ a reference to a ground. **Fix: make the moderator
  pick a category (a ToS clause id) in addition to free text** — Velanto already has a rules taxonomy with
  category ids (backend owns ids/order/version), so reuse it.
- **(f)** — **redress information**. Almost certainly absent. Even though Arts. 20/21 are exempt, Art. 17(3)
  (f) is **not** exempt, and **judicial redress always exists**. Minimum viable text: how to contact
  Velanto to contest, and that the user may bring the matter before a court. **Do not** cite Art. 21
  out-of-court bodies if you are exempt and haven't engaged one.

**Delivery, not just storage.** Art. 17(1) says _provide … to affected recipients_. Storing a
`rejectionReason` in the DB is not providing it. It must **reach the author** (in-app notice on the pack +
ideally email), **at the latest on the date the restriction is imposed** (Art. 17(2)). Art. 17(2)'s
"electronic contact details are known" limb is satisfied for every registered Velanto user.

**Scope trap — Art. 17 covers more than rejection/ban.** "restrictions of the **visibility** … including …
**demoting** content" (17(1)(a)) means any future shadow-demotion of a pack also triggers a statement of
reasons. And **the pre-publication moderation queue itself**: if a pack is rejected it never goes live —
that is a restriction on the ground of ToS-incompatibility and Art. 17 applies. (Whether _mere queue
latency_ before any decision is a "restriction" is a **judgment call**; the better view is no — no decision
has been taken yet — but an indefinite hold is functionally a refusal.)

⚠️ Art. 17 does **not** require submitting statements of reasons to the Commission's **DSA Transparency
Database** for Velanto: that duty is **Art. 24(5)**, which is in **Section 3** and therefore **exempt** under
Art. 19.

**PRIMARY — Art. 24(5) (verified verbatim):** "Providers of online platforms shall, without undue delay,
**submit to the Commission the decisions and the statements of reasons referred to in Article 17(1) for the
inclusion in a publicly accessible machine-readable database managed by the Commission**. Providers of
online platforms shall ensure that the information submitted does not contain personal data."

Art. 24(5) sits in Section 3 and is **not** carved back in by Art. 19(1) (which carves back **only** Art.
24(3)). → **Velanto must produce statements of reasons under Art. 17, but must NOT/need NOT file them to the
DSA Transparency Database.** **This is a significant saving** and a common point where secondary law-firm
summaries overstate the burden for micro platforms.

---

## 6. Art. 16 — notice and action (APPLIES, no exemption)

**PRIMARY — Art. 16(1):** "Providers of hosting services shall put mechanisms in place to allow **any
individual or entity** to notify them of the presence on their service of specific items of information
that the individual or entity considers to be **illegal content**. Those mechanisms shall be **easy to
access and user-friendly**, and shall allow for the submission of notices **exclusively by electronic
means**."

**PRIMARY — Art. 16(2):** mechanisms must "facilitate the submission of sufficiently precise and adequately
substantiated notices", enabling notices containing **all** of:

> "(a) a **sufficiently substantiated explanation of the reasons** why the individual or entity alleges the
> information in question to be illegal content;
> (b) a **clear indication of the exact electronic location** of that information, such as the **exact URL
> or URLs** …;
> (c) the **name and email address** of the individual or entity submitting the notice, **except** in the
> case of information considered to involve one of the offences referred to in Articles 3 to 7 of Directive
> 2011/93/EU [child sexual abuse offences];
> (d) a **statement confirming the bona fide belief** of the individual or entity submitting the notice that
> the information and allegations contained therein are accurate and complete."

**PRIMARY — Art. 16(3):** "Notices … shall be considered to give rise to **actual knowledge or awareness for
the purposes of Article 6** in respect of the specific item of information concerned where they allow a
diligent provider … to identify the illegality … **without a detailed legal examination**."

**PRIMARY — Art. 16(4):** "Where the notice contains the electronic contact information of the individual or
entity that submitted it, the provider … shall, **without undue delay, send a confirmation of receipt** of
the notice to that individual or entity."

**PRIMARY — Art. 16(5):** "The provider shall also, **without undue delay, notify that individual or entity
of its decision** in respect of the information to which the notice relates, **providing information on the
possibilities for redress** in respect of that decision."

**PRIMARY — Art. 16(6):** "Providers … shall **process** any notices … and take their decisions … in a
**timely, diligent, non-arbitrary and objective manner**. Where they use **automated means** for that
processing or decision-making, they shall **include information on such use in the notification referred to
in paragraph 5**."

### Does Velanto's reports feature satisfy Art. 16? **Partially. Gaps identified.**

Velanto has a reports queue with review/close — that's the skeleton of Art. 16(1) and (6). What must be
added/checked:

| Art. 16 requirement                                              | Likely Velanto status                                                                              | Action                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16(1) open to **any individual or entity**                       | ⚠️ **Likely broken** — reporting is probably gated behind login                                    | **Non-logged-in users and non-users must be able to report.** Add a public report route (e.g. a form at `/report` or an email address) that does not require an account. This collides with the existing "anon-gate: block not redirect" convention — Art. 16 is a legal reason to make _reporting_ an exception to the anon gate. |
| 16(1) easy to access, user-friendly, electronic-only             | probably OK                                                                                        | keep the report control on/near every pack + comment                                                                                                                                                                                                                                                                               |
| 16(2)(a) substantiated explanation                               | ?                                                                                                  | free-text reason field, required                                                                                                                                                                                                                                                                                                   |
| 16(2)(b) exact URL/location                                      | implicit (report is attached to the entity) — OK for in-app; **needed for the public/email route** | capture pack/comment id + URL                                                                                                                                                                                                                                                                                                      |
| 16(2)(c) name + email of notifier                                | ⚠️ probably absent for logged-in reporters, definitely needed for anonymous route                  | collect; **must NOT be required for CSAM-type reports** (Art. 16(2)(c) exception — Dir. 2011/93/EU Arts. 3–7). Practical: allow anonymous submission for that category.                                                                                                                                                            |
| 16(2)(d) **bona fide statement**                                 | ⚠️ **almost certainly missing**                                                                    | add a required checkbox: "I confirm in good faith that the information and allegations in this notice are accurate and complete."                                                                                                                                                                                                  |
| 16(4) **confirmation of receipt** without undue delay            | ⚠️ **likely missing**                                                                              | auto-acknowledge (in-app + email)                                                                                                                                                                                                                                                                                                  |
| 16(5) **notify the notifier of the decision** + **redress info** | ⚠️ **likely missing** — the queue has review/close but probably closes silently                    | notify the reporter on close, with outcome + redress info                                                                                                                                                                                                                                                                          |
| 16(6) disclose automated processing in the 16(5) notice          | ⚠️ missing                                                                                         | if the hate/slur filter auto-actions a report, say so                                                                                                                                                                                                                                                                              |

**Art. 16(3) is the liability hinge and deserves emphasis.** A sufficiently precise notice gives Velanto
**actual knowledge** under **Art. 6** (hosting safe harbour). Once on notice, Velanto keeps the Art. 6
liability shield only if it acts "expeditiously to remove or to disable access". **So the reports queue is
not merely a compliance checkbox — it is what protects Velanto from liability for its users' content.** An
unattended reports queue converts other people's illegal uploads into Velanto's own liability. For a solo
operator this is the highest _practical_ risk in this entire document — far more than regulator
enforcement (§7).

⚠️ **Art. 16 is about _illegal content_.** Velanto's existing reports feature probably also handles
"this pack is bad/spam/rule-breaking". That's fine and independent — but the **illegal-content path must
exist and must carry the 16(2)/(4)/(5) machinery.** Simplest design: one report form, a category selector,
and the Art. 16 machinery applied to all of it (over-compliance here is cheap).

**Art. 18** (Section 2, **not exempt**): if Velanto ever becomes aware of information suggesting a criminal
offence **involving a threat to life or safety**, it must promptly inform law-enforcement/judicial
authorities of the Member State concerned (or Europol / the Member State of the legal representative if the
MS can't be identified — Art. 18(2)). This needs a documented internal runbook, not code.

---

## 7. Enforcement reality — honest assessment

**Who enforces (PRIMARY, structural):** Under the DSA's Chapter IV, non-VLOP providers are supervised by
the **Digital Services Coordinator of establishment** — for a non-EU provider, **Art. 3(n)** defines that as
"the Digital Services Coordinator of the Member State where the main establishment of a provider … is
located **or its legal representative resides or is established**". The Commission's exclusive supervision
is reserved for VLOPs/VLOSEs. So: **the DSC of whichever Member State Velanto's Art. 13 representative sits
in is Velanto's regulator.** Choosing the representative therefore chooses the regulator.

**Penalties — PRIMARY, Art. 52 (now verified verbatim):**

- **Art. 52(1):** "**Member States shall lay down the rules on penalties** … applicable to infringements …
  by providers of intermediary services **within their competence** …" → penalties are national, not
  Commission-set, for a non-VLOP like Velanto.
- **Art. 52(2):** "Penalties shall be **effective, proportionate and dissuasive**." ← _proportionate_ is
  load-bearing for a zero-revenue hobby project.
- **Art. 52(3):** "…the **maximum amount of fines** … for a failure to comply with an obligation laid down
  in this Regulation shall be **6 % of the annual worldwide turnover** of the provider … in the preceding
  financial year." And **1 %** "for the supply of incorrect, incomplete or misleading information, failure
  to reply or rectify … and failure to submit to an inspection".
- **Art. 52(4):** periodic penalty payments max **5 % of average daily worldwide turnover or income** per
  day.

**Note the arithmetic:** these are _ceilings expressed as percentages of turnover_. **6 % of zero revenue is
zero.** Art. 52(4) says "turnover **or income**", and 52(3)'s 1 % limb also says "annual income or
worldwide turnover" — so the 1 % limb could in principle reach personal income, but the headline 6 % limb is
turnover-only. Member States set the actual rules and **may** express minima in absolute terms — national
implementing law not researched here.

**Art. 51 (structure, PRIMARY in substance):** DSCs also hold **non-financial** powers — investigative
orders, the power to require an infringement be terminated, periodic penalty payments, **interim measures**,
and (in extreme cases, via a judicial authority) **restricting access to the service**. For a zero-revenue
provider, _these_ are the powers that would actually matter — a fine of 6 %-of-nothing is no deterrent, but
an access-restriction order would end the project.

**Art. 53 (PRIMARY):** "**Recipients of the service and any body, organisation or association** …" have a
right to lodge a complaint with a DSC. → Enforcement does not require a regulator to notice you
independently; **any single aggrieved user can start the file.** This meaningfully qualifies the "no
regulator will ever look at us" reasoning below.

**Honest reality check:**

- **Is _proactive_ regulator enforcement against a zero-user, zero-revenue Ukrainian hobby platform likely?
  No.** DSCs are under-resourced and prioritise scale and harm. No DSC is going to go looking for Velanto at
  launch. Anyone telling you otherwise is selling compliance services.
- **But enforcement is complaint-driven, not just sweep-driven (Art. 53).** A single user who feels unfairly
  banned can lodge a complaint with a DSC. That's a plausible scenario at _any_ user count, and it is the
  most likely route by which Velanto ever meets a regulator. The cheap defence is exactly Arts. 14 + 17:
  published rules, and a reasoned decision the user can read.
- **But three things make this non-theoretical:**
  1. **Art. 13 is a public, visible, binary fact.** Either the representative is named on the site or it
     isn't. It's the cheapest thing to check and the easiest to be caught on — and it's the one obligation
     that _cannot_ be satisfied by writing better ToS.
  2. **Art. 16(3)/Art. 6 liability is not regulator-driven.** It bites via _private_ action — a rightsholder,
     a defamed person, a national court. That happens at any scale, including one aggrieved user. This is the
     real exposure.
  3. **Enforcement risk scales with the first bad actor, not with user count.** The day someone uploads CSAM
     or a defamatory pack, all of this becomes immediate. The queue-before-publish design is genuinely good
     protection here — Velanto's moderation-on-approval model is _stronger_ than the DSA requires.
- **Proportionality:** the DSA drafters deliberately exempted micro enterprises from the expensive parts.
  What's left (Arts. 13, 14, 16, 17) is roughly: **name a representative, write honest ToS, let people report
  things, tell people why you acted.** That is a weekend of work, not a compliance programme. Do it.

---

## 8. Art. 13 vs GDPR Art. 27 — two representatives, one person?

- **Distinct legal bases, distinct duties.** GDPR **Art. 27** representative = for data-protection matters,
  addressed by supervisory authorities and **data subjects**, must be in a Member State where the targeted
  data subjects are. DSA **Art. 13** representative = for DSA matters, addressed by **DSCs, the Commission
  and the Board**, must be in a Member State where the provider offers services. Two separate appointments;
  appointing one does **not** satisfy the other.
- **Can they be the same person?** **Nothing in Art. 13 prohibits it**, and Art. 13(1) expressly allows "a
  **legal or natural** person". Commercially this is exactly what the representative-service industry sells
  (a single provider covering GDPR Art. 27 + DSA Art. 13). **The prohibition does not exist in the text —
  but that is an argument from silence.** ⚠️ **UNVERIFIED**: no Commission guidance located in this run
  expressly confirming that a single entity may hold both mandates. Treat "same person" as **very likely
  fine and standard market practice (SECONDARY)**, not as a primary-source certainty.
- **Practical consequence for Velanto:** pick **one Member State**, appoint **one provider** to act in both
  capacities. That choice also fixes your **DSC of establishment** (Art. 3(n)) — i.e. picks your regulator.
  Cost is the real issue: these services are typically low-hundreds of EUR/year — a genuine, recurring cost
  for an unpaid solo operator, and one of the few unavoidable cash costs of launching to the EU.
- **Art. 13(3) matters when recruiting one:** the representative "**can be held liable** for non-compliance"
  — which is why providers charge, and why a friend-in-the-EU favour is a bad idea.
- **Art. 13(5):** appointing a representative does **not** create an EU establishment — so this does not
  drag Velanto into EU corporate/tax establishment. Useful reassurance.

---

## 9. Action list (ordered by ratio of legal weight to effort)

1. **Appoint an Art. 13 legal representative** in one Member State; publish name, postal address, email,
   phone on the site (Art. 13(4)); notify that MS's DSC. Combine with the GDPR Art. 27 appointment.
   _Bright-line, unavoidable, cannot be engineered around._
2. **Rewrite `/terms`** to Art. 14(1): restrictions; the pre-publication **moderation queue**; the
   **trusted/staff bypass**; the **automated hate/slur filter** (algorithmic decision-making) + human
   review; **rejection with reason**; **ban** grounds; how to report. Plain language. (FE #204 lawyer review
   should cover this — flag these as required contents.)
3. **Art. 16 gaps:** public (non-logged-in) reporting route; bona-fide-belief checkbox; notifier
   name/email (with the CSAM exception); **auto-confirmation of receipt**; **decision notification to the
   reporter with redress info**.
4. **Art. 17 gaps:** deliver the statement of reasons to the author (don't just store it); add
   **automated-means-used** flag; add a **structured ground reference** (reuse the rules-category ids);
   add **duration** for bans; add **redress info** (contact + judicial redress).
5. **Art. 12** single point of contact for recipients — must not rely solely on automated tools; publish it.
6. **Art. 14(2)** mechanism to notify users of significant ToS changes.
7. Keep the ability to compute average monthly active EU recipients (**Art. 24(3)**, on request only).
8. Document an **Art. 18** runbook (threat-to-life → law enforcement/Europol).
9. **Do NOT build:** Art. 20 internal complaints, Art. 21 out-of-court dispute settlement, Art. 22 trusted
   flaggers, Art. 23 misuse suspensions, Art. 15/24(1)(2) transparency reports, Art. 24(5) Transparency
   Database submissions, Art. 25/26/27/28. **All exempt.** Revisit only if Velanto outgrows micro/small.

## 10. Confidence and limits of this research

- **PRIMARY and verified verbatim:** Arts. 2, 3 (definitions d, e, g, i, k, r, s, t, u), 12, 13, 14, 15, 16,
  17, 18, 19, 24 (incl. 24(3) and 24(5)), 52, 53, and **Recital 8**. All quotes above from the authentic OJ
  text via the cellar endpoint.
- **Verified structurally:** Section 2 = Arts. 16–18, Section 3 = Arts. 19–28 (headings read inline in the
  OJ text). This drives the whole Art. 19 analysis.
- **SECONDARY / reasoning:** the Art. 14(1) "rules of procedure of internal complaint handling" _effet
  utile_ argument (§4.7); the targeting analysis under Art. 3(e) (§1).
- **UNVERIFIED (not researched in this run — do not rely on):** Recommendation 2003/361/EC micro thresholds
  read verbatim (<10 staff / ≤€2m — asserted from knowledge); Commission guidance on "machine-readable"
  (Art. 14(1)); Commission guidance confirming one person may hold both the GDPR Art. 27 and DSA Art. 13
  mandates (§8 — argument from silence in the text + market practice only); Art. 56 competence allocation
  read verbatim (structure asserted from Art. 3(n) + the general scheme); national implementing law setting
  actual penalty levels; GDPR Art. 27 text itself (its requirements are assumed from the prior
  establishment that it applies).
- **Correction made during this run:** Recital 8 was initially paraphrased from knowledge, then **verified
  verbatim** — the paraphrase was accurate (language/TLD/national app store/local advertising as targeting
  factors; "mere technical accessibility" insufficient). Recital 8 additionally states that substantial
  connection "should also be assumed where a service provider **directs its activities** to one or more
  Member States within the meaning of **Article 17(1), point (c), of Regulation (EU) No 1215/2012**"
  (Brussels I bis consumer-contract "directing activities" test) — a further hook that catches Velanto.
- **Not researched:** Member-State-specific implementing laws; whether any DSC has published a micro-platform
  guide; ODD/e-Commerce-Directive interaction (Art. 2(3) preserves Dir. 2000/31/EC).
