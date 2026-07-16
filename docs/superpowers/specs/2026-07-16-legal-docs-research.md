# Terms & Privacy — Research Findings (2026-07-16)

Research backing a full rewrite of `/terms` and `/privacy`. Produced by six parallel agents: one auditing the code, five researching the law. **Not legal advice** — this is research support. Every claim is marked PRIMARY (regulation text, EDPB, a DPA, a court) or SECONDARY, and unverified items are flagged as such rather than smoothed over.

**Context:** Velanto is a free elimination-quiz-pack platform. Solo operator established in **Ukraine**, no EU establishment. Users register (email/username/password), author packs, play, comment, vote, report; staff moderate. No payments, no ads, no analytics, no special-category data, no profiling. EU users; UI in 11 languages.

**Decisions already taken by the owner (2026-07-16):**

- Keep all 11 translations; English is authoritative via a governing-language clause.
- Add a **real age gate** with a stated minimum (not a claim without a mechanism).
- **GDPR-grade rights for everyone**, no geo-branching.
- Name the owner **personally** as controller + a contact email (ФОП not required for controller status).

---

## 1. THE BLOCKER: an EU representative is required (Art. 27)

**This gates the privacy notice** — Art. 13(1)(a) requires the representative's identity _in the notice_, so the document cannot be finished until this is resolved.

**Verdict: required. Staying small does not avoid it.**

The only escape is the Art. 27(2)(a) exemption, whose conditions are **cumulative**: processing that is _occasional_ AND not large-scale special-category AND unlikely to result in risk. Velanto fails the first, so the other two — both true — buy nothing.

> "the EPDB considers that a processing activity **can only be considered as 'occasional' if it is not carried out regularly, and occurs outside the regular course of business or activity** of the controller or processor"
> — EDPB Guidelines 3/2018, p. 25. **PRIMARY, verbatim.**

Note "**or activity**" — a non-commercial hobby project is covered. Note also that "large scale" qualifies _only_ the special-categories limb, not "occasional": **zero users today changes nothing**, because the moment EU users register, processing is regular.

Corroboration — WP29's Art. 30(5) paper (**PRIMARY**): _"a small organisation is likely to regularly process data regarding its employees. As a result, such processing cannot be considered 'occasional'"_. If routine employee data isn't occasional, routine user-account data isn't either.

> "A controller or processor not established in the Union but subject to the GDPR **failing to designate a representative in the Union would therefore be in breach of the Regulation**." — EDPB p. 23. **PRIMARY.**

**⚠️ Trap:** the same word works oppositely one Article over. Art. 30(5)'s triggers are **disjunctive** ("or") _for an obligation_; Art. 27(2)(a)'s conditions are **cumulative** _for an exemption_. Reasoning by analogy between them gives the wrong answer.

**Rigour:** the _definition_ is PRIMARY and near-dispositive. The _application_ to a user-account platform is an inference — the EDPB gives no example of a small free platform under Art. 27(2)(a) — but it's a short step.

### An EU-resident friend can legally serve — and it solves the address problem

- Art. 4(17): _"'representative' means a **natural or legal person** established in the Union…"_ — natural person is listed **first**. No licensing, professional standing, insurance, or minimum size is required anywhere.
- EDPB p. 24: _"the function of representative in the Union **can be exercised based on a service contract concluded with an individual or an organisation**, and can therefore be assumed by a wide range of **commercial and non-commercial entities**"_. Permissive — "can be exercised based on", not "must be".
- **Nothing requires the rep to be paid.** Art. 27(1) + Recital 80 require a **written mandate**; consideration is a matter of national contract law (untested for gratuitous mandates).
- **The nice consequence:** Art. 27(3) forces the rep to be established in a Member State, and EDPB Example 24 requires the **rep's** name and contact in the notice. **So the rep's EU address becomes the published contact point — the owner does not publish a home address in Ukraine.** The Art. 27 duty and the "must I dox myself" problem solve each other. _(Inference from primary text.)_

**Constraints on the choice (all PRIMARY):**

- Must be established in a Member State **where the data subjects are** (Art. 27(3)).
- **Cannot** also be the external DPO (EDPB p. 24) or a **processor** for the same controller (pp. 24–25).
- Must maintain the **Art. 30 record** and answer **Art. 58(1)(a)** orders — a real, if narrow, personal duty. The controller must _feed_ them the record; the rep must _hold and produce_ it.
- Name + contact **published** in the notice (Arts. 13(1)(a)/14(1)(a)); failure = breach of transparency.
- No DPA notification of the designation is required (EDPB p. 25).

### 🚩 DO NOT place the representative in Spain

**LOPDGDD Art. 30 (PRIMARY, BOE consolidated text)** imposes **joint and several liability** by statute:

> "podrán imponer al representante, **solidariamente con el responsable o encargado del tratamiento**, las medidas establecidas en el Reglamento (UE) 2016/679 … sin perjuicio de … el **ejercicio por el representante de la acción de repetición**"
> Art. 30.2: "los responsables, encargados y representantes **responderán solidariamente de los daños y perjuicios causados**."

The rep pays first and sues a non-EU controller to recover. This **contradicts the EDPB's comfort** that liability is "limited to Articles 30 and 58(1)(a)" — and it is hard law, not guidance. Compatibility with GDPR is contested; **avoid rather than litigate**. LOPDGDD Art. 70.1(c) also makes reps sanctionable subjects (and Art. 70.2 exempts the DPO but **not** the rep).

**Germany** is milder but not free: **§44(3) BDSG** makes the rep an **authorized recipient in civil proceedings** — service of process lands on the individual's doormat.

### Liability of the rep generally — narrower than it looks

> "**The GDPR does not establish a substitutive liability of the representative** in place of the controller or processor… This includes the possibility for supervisory authorities to address corrective measures or administrative fines… **to the representative** … **The possibility to hold a representative directly liable is however limited to its direct obligations referred to in articles 30 and article 58(1) a**"
> — EDPB pp. 27–28. **PRIMARY, verbatim.**

Read carefully that is a **service-of-process** rule, not a liability rule (except in Spain).

**Only judicial authority anywhere:** _Sanso Rondón v LexisNexis Risk Solutions UK Ltd_ [2021] EWHC 1427 (QB) — claim against an Art. 27 rep **struck out**. **UK, first-instance, not binding in the EU.** At [97]: _"Art.27 is not ambiguous… **it does not create 'representative liability'**"_. At [99], a telling drafting history: the EDPB's **consultation draft** said the intent was "to hold representatives liable"; the **final** text dropped it — strong evidence of a deliberate retreat.

**Whether a private individual may serve has never been tested** by any DPA, court, or the EDPB. Permitted by text, prohibited by nothing, adjudicated never. Vendor claims that authorities "strongly favour professional companies" are **marketing** — unsupported by any located authority. The legitimate countervailing point: professionals carry indemnity insurance; a friend does not.

### ❌ NOT VERIFIED — must be re-run

- **EU-rep vendor pricing.** No retrieved source. (Figures like "DataRep ~€150/yr, Prighter ~€420/yr" exist in agent recollection but **cannot be substantiated** and must not be relied on.)
- **Enforcement cases** against non-designating controllers. Same.

---

## 2. Territorial scope — GDPR applies (Art. 3(2))

**Limb A — "free" is irrelevant. BRIGHT LINE.**

> "Article 3(2)(a) specifies that the targeting criterion… applies **irrespective of whether a payment by the data subject is required**." — EDPB Guidelines 3/2018, p. 16. **PRIMARY, verbatim.**

**Limb B — the 11-language UI is the targeting evidence. Judgment call, leans strongly yes.**

Recital 23 (**PRIMARY**): _"the use of a language generally used in the third country where the controller is established, is **insufficient**… factors such as **the use of a language … generally used in one or more Member States** … may make it apparent that the controller envisages offering goods or services to data subjects in the Union."_

**Why it bites here:** Ukrainian, Russian and arguably English fall inside the Recital 23 **safe harbour**. **German, French, Polish, Spanish, Italian do not.** Shipping those UIs is the textbook indicium.

- **EDPB Example 14 (p. 18)** — Turkish site available in four EU languages + delivery to six Member States ⇒ targeting, **and** _"In accordance with Article 27, the data controller will have to designate a representative in the Union."_
- **EDPB Example 16 (p. 19)** — Swiss university in German + English ⇒ **not** targeting (German is generally used in Switzerland).

**Honest counter-argument:** Example 14 had _two_ factors; Velanto realistically has **one** (languages, no "ordering"). The EDPB requires an _in concreto_ analysis of the combination and says single elements _"taken alone may not amount to a clear indication"_. Recital 23 also couples the language factor to _"the possibility of ordering goods and services in that other language"_. **Assessment: the counter-argument is real but thin. Plan on GDPR applying.**

---

## 3. Controller identity — unblocked

- **A natural person can be a controller. BRIGHT LINE.** Art. 4(7): _"the **natural** or legal person … which … determines the purposes and means"_. **ФОП status is irrelevant to controller status.**
- **Household exemption does not apply.** Art. 2(2)(c) + Recital 18 (_"no connection to a professional or commercial activity"_), and **CJEU C-101/01 _Lindqvist_ para. 47**: the exemption covers only _"activities which are carried out in the course of private or family life… **which is clearly not the case with the processing of personal data consisting in publication on the internet so that those data are made accessible to an indefinite number of people**"_. _(Retrieved from dpcuria.eu — SECONDARY retrieval; curia/EUR-Lex blocked.)_
- **A physical address is not required by Art. 13(1)(a)**, which says only _"the identity and the contact details"_. Name + working email satisfies the text on its face.
  - ⚠️ **UNVERIFIED:** WP260 is widely quoted as saying contact info _"**preferably** allow for different forms of communications… (e.g. phone number, email, postal address etc.)"_ — could not be confirmed (the Annex page has no text layer). Note "preferably".
  - **Resolved anyway by the Art. 27 rep's published EU address** (see §1).

---

## 4. Cookies / ePrivacy — no banner needed, but two live issues

**Art. 5(3) has exactly two exemptions** (transmission; strictly necessary). WP194 (Opinion 04/2012) sets a high bar for "strictly necessary": the functionality is explicitly requested **and** _"if cookies are disabled, the functionality will not be available."_

### 🚩 The refresh cookie is the weak link — NOT Sentry (this reverses the usual assumption)

> "**Persistent login cookies which store an authentication token across browser sessions are not exempted under CRITERION B.** This is an important distinction because the user may not be immediately aware of the fact that closing the browser will not clear their authentication settings."
> — WP194 §3.2. **PRIMARY, verbatim.**

Velanto's refresh cookie is **30 days persistent**, with **no "remember me" anywhere** (verified: `auth.controller.ts:42-48`, `REFRESH_TOKEN_TTL_MS`; grep for `rememberMe` → 0 hits). WP194's own remedy is a _"remember me (uses cookies)"_ checkbox — i.e. **consent**.

**Judgment call, not bright-line:** WP194 is 2012; CNIL's list exempts authentication trackers _without_ repeating the persistence caveat; the ICO now treats persistent cookies as exemptible with prominent information. **Cheap mitigation: a "keep me signed in" checkbox** (session cookie by default, persistent only if ticked).

### Sentry — genuinely unresolved, but probably moot

- **No EU DPA or EDPB guidance on error monitoring exists.** Every source found was a CMP vendor or Sentry's own marketing. That absence is itself the finding.
- **🚩 The popular defence is legally malformed.** _"Sentry is strictly necessary under GDPR Recital 49"_ is a **category error**: Recital 49 supports a **GDPR lawful basis**; Art. 5(3) ePrivacy is a **separate, prior, stricter gate**. Consent under 5(3) cannot be substituted by a legitimate-interest balancing. **Do not rely on this argument.**
- Against exemption: WP194's test is "if disabled, the functionality is unavailable" — the site works fine without Sentry. WP194 §4.3 used exactly that reasoning to deny the exemption to **first-party analytics**.
- For exemption (**UK only**): PECR Schedule A1 now names _"to prevent or detect technical faults"_ — a **UK statutory addition with no EU equivalent**.
- **✅ Probably moot: verified empirically that Sentry writes ZERO storage keys** (browser inventory below), and there is **no Session Replay** (`instrumentation-client.ts` sets only `dsn`/`enabled`/`environment`/`tracesSampleRate`). If it writes nothing to the device, **Art. 5(3) isn't triggered at all** and the question collapses to a pure GDPR-disclosure one. _(Observed with Sentry `enabled:false` — the dev default. Re-verify with it enabled to be rigorous.)_

### 🚩 ICO guidance is NO LONGER valid authority for EU users

The UK's **Data (Use and Access) Act 2025** (effective 5 Feb 2026) substituted PECR reg. 6 and inserted Schedule A1, adding **three exemptions the EU never adopted**: statistical purposes, appearance, emergency assistance.

- ICO's **analytics** exception **does not exist in the EU**.
- ICO's **"appearance"** exception (theme/locale) **does not exist in the EU** — the theme/locale exemption must rest on CNIL/WP194 UI-customisation reasoning instead.
- ICO's **"technical faults"** exception is **UK statute** and cannot carry the Sentry argument.

**Much of the free English-language commentary now silently describes UK law.** This alone would poison a naïve DIY attempt.

### No banner required; no cookie table legally required

Where every purpose is exempt there is no consent to collect. **Recital 66 of Dir. 2009/136/EC** exempts qualifying storage from **both** the consent duty **and the information duty** — so **ePrivacy imposes no disclosure duty here; GDPR Art. 13 does**, and only where personal data is processed.

CNIL Q18 (**PRIMARY**): _"Si l'article 82 … n'impose pas d'informer les utilisateurs sur l'utilisation de tels traceurs, la CNIL **recommande** qu'ils soient informés de leur existence…"_ — and separately, _"les personnes doivent être informées conformément au RGPD de tous les traitements de données à caractère personnel."_

CNIL draws the line precisely: a language-preference cookie storing only a language value _"ne constitue pas un traitement de données à caractère personnel soumis au RGPD"_. **Applied here:** theme/locale/filters are likely **outside GDPR entirely**; the auth session and Sentry (user id + username) are **inside** it.

**A name/purpose/duration table is NOT a legal requirement** anywhere verifiable — it's a convention CMP vendors market. A short prose paragraph satisfies CNIL's recommendation and Art. 13.

**What would flip the "no banner" answer:** adding **any** analytics (there is **no EU analytics exemption** — WP194 §4.3 is explicit); any ad-tech or social plugin; an embedded third-party that stores on load. _(`YouTubeCard` already facade-loads, which is the right pattern — but the iframe is `youtube.com`, not `youtube-nocookie.com`; see §6 A4.)_

---

## 5. Terms of Service vs EU consumers — what actually survives

### 🚩 The most important question: is a solo hobbyist a "trader"? Genuinely open — and closing

**Not-for-profit is irrelevant.** CJEU **C-147/16 _Karel de Grote_**, via Commission Notice 2019/C 323/04 §1.2.1.1 (**PRIMARY**): _"**the fact that a body is a not-for-profit organisation is irrelevant** to the definition of the notion of 'seller or supplier'"_. Scratch that argument entirely.

But "not-for-profit" ≠ "not a trade/business/profession". **CJEU C-105/17 _Kamenova_** gives the multi-factor test (**PRIMARY**, para 38): organised manner; intended to generate profit; technical expertise placing the seller _"in a more advantageous position than the consumer"_; legal status enabling commercial activity; connection to professional activity; VAT; remuneration. Para 39: non-exhaustive, non-exclusive. Para 40: profit alone is **not sufficient**.

**⚠️ _Kamenova_ interprets the UCPD/CRD, not 93/13.** Extending it to 93/13 Art. 2(c) is a well-supported **inference**, not a verified holding.

| Factor                          | Velanto                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------- |
| Organised manner                | **Against** — domain, branding, CI/CD, moderation + admin panels, roles       |
| Intended to generate profit     | **For** — none (but para 40: not decisive)                                    |
| Technical expertise / advantage | **Against** — professional dev running a platform for lay users               |
| Legal status enabling commerce  | **For (today)** — no ФОП. **Registering ФОП materially strengthens "trader"** |
| Connection to profession        | **Ambiguous/against** — software dev running a software platform              |
| VAT / remuneration              | **For** — neither                                                             |

**Recommendation: draft as if you ARE a trader.** Cost of doing so: a few sentences of tone. Cost of being wrong the other way: the whole document collapses at once, retroactively, in a consumer's home forum. Keep "not a trader" as a _litigation fallback_, not a _drafting premise_. **The direction of travel is one-way**: ads, donations, a Pro tier, or a ФОП makes the finding near-certain.

### Does 93/13 apply to a free service? Commission says yes — but the footnotes are thinner than advertised

Commission Notice §1.2.2 (**PRIMARY**): _"The UCTD does **not require** that the consumer has to provide **monetary consideration**… contracts between consumers and providers of social media services must be considered to be covered by the UCTD regardless of whether consumers have to pay"_.

**⚠️ Honest sourcing flag:** its footnotes rest on **surety/guarantee cases** (C-74/15 _Tarcău_, C-534/15 _Dumitraș_) **by analogy**, plus a **CPC enforcement-network common position** — **not** a CJEU holding on free online services. **No CJEU judgment squarely holds 93/13 applies to a zero-price consumer online service.** It is nonetheless the position every EU consumer authority will take. Plan around it.

### Dir. 2019/770 (Digital Content) — probably doesn't apply, but it's one decision away

Art. 3(1) sub-2 extends the DCD where the consumer _"**provides … personal data**"_ **except** where those data are _"**exclusively** processed … for the purpose of supplying"_ or legal compliance, **and** the trader _"does not process those data for any other purpose"_. **Conjunctive — one non-qualifying purpose kills the carve-out for the whole contract.**

- **Recital 24 names the fact pattern**: _"the consumer opens a social media account and provides a name and email address **that are used for purposes other than solely supplying**"_ — saved only by that qualifier, which is doing all the work.
- **Recital 25 helps**: _"registration … required by applicable laws for security and identification purposes"_ is carved out. Member States may nonetheless **extend** the DCD to carved-out situations — not harmonised.
- **🚩 Sentry is the crack.** Is crash telemetry (user id + username → third-party processor) _"exclusively for the purpose of supplying"_? **No authority found either way.** Adding product analytics would destroy the carve-out outright.

**Conclusion: probably out of scope — moderate confidence only.**

**If it applied, remedies are near-worthless here anyway:** Art. 14(4) makes price reduction available **only where a price was paid**; termination of a free account = closing it. **But note the trap:** Art. 14(6)'s "not minor" filter is _also_ conditioned on a price — so a data-only consumer could terminate for a **minor** non-conformity. **Art. 3(10) expressly leaves damages to national law** — so the money question routes through national law, not the DCD.

### The mandatory floor is NATIONAL law, not EU-harmonised

**There is NO EU-harmonised rule voiding exclusions for death/PI, gross negligence, or intent.** 93/13's Annex is _"indicative and non-exhaustive"_ (Art. 3(3)). The hard prohibitions live in national law under the Art. 8 minimum-harmonisation clause — **27 answers; this research verified two.**

**Germany (PRIMARY, official translation):**

- **§276(3) BGB**: _"The obligor **may not be released in advance from liability for intent**."_ Absolute; not waivable; applies even to negotiated contracts.
- **§309 no. 7 BGB** (ineffective in standard terms): **(a) life/limb/health** — cannot exclude even for **simple negligence**; **(b) other damage** — cannot exclude **gross** negligence or intent.
- **⚠️ Note the asymmetry:** for "other damage", **simple negligence CAN be excluded**. _For a free quiz platform, "other damage" is essentially all the damage there is — this is the most valuable surviving clause._
- §310(3) confirms §309 applies in full to a click-through consumer ToS. _(§309 is disapplied for **B2B** — which is why German B2B terms are more aggressive. Don't copy those.)_
- **Gratuitous contracts get a lower standard**: §521 (donation), §599 (loan for use) — _"responsible only for intent and gross negligence"_; §690 (gratuitous safekeeping) — _"the care that they customarily exercise in their own affairs"_. **Two independent routes converge on intent + gross negligence.** ⚠️ But these are _specific contract types_; whether a free web platform is analogised to them is **unverified**.

**France (⚠️ SECONDARY — Légifrance returned HTTP 403 to every attempt):** **Code de la consommation R. 212-1, 6°** reportedly black-lists (_"de manière irréfragable présumées abusives"_) any clause that suppresses **or merely reduces** the right to compensation for **any** breach. **If accurate, France is materially harsher than Germany and a damages cap is simply void there.** **VERIFY BEFORE RELYING.**

### ⭐ The single highest-leverage sentence

> _"Nothing in these Terms limits or excludes liability for intent, gross negligence, death or personal injury, or any liability that cannot be limited or excluded under applicable mandatory law."_

Converts a void-and-embarrassing clause into one enforceable to its lawful maximum, **EU-wide, without knowing any Member State's law**. This matters more than it looks because of **German _Verbot der geltungserhaltenden Reduktion_** (no blue-pencil reduction of standard terms — an overbroad clause fails **entirely** rather than being trimmed to its lawful core). **⚠️ SECONDARY — well-established doctrine but unverified from primary text.** If right: **over-reaching is not free; you keep nothing.**

### The grey list — what to fix

| Clause                                                              | Status                                   | Fix                                                                                                                                              |
| ------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| "We may modify these Terms at any time; continued use = acceptance" | Annex **1(j)/1(k)**                      | **Annex 2(b) sub-2 expressly permits it** for indeterminate-duration contracts with **reasonable notice + free right to dissolve** (**PRIMARY**) |
| "We may terminate for any reason"                                   | Annex **1(f)/1(g)**                      | **Serious grounds**, or **reasonable notice**                                                                                                    |
| "We alone determine breach / interpret these Terms"                 | Annex **1(m)**                           | ⚠️ Easy to write accidentally in a **moderation** clause — check that language                                                                   |
| Arbitration / class waiver / US venue                               | Annex **1(q)**                           | **Delete.** Buys nothing in the EU; the single most visible red flag to a regulator                                                              |
| "MERCHANTABILITY / FITNESS FOR A PARTICULAR PURPOSE"                | US (UCC) concepts with no EU counterpart | **Delete.** Arguably breaches Art. 5's plain-language duty → **contra proferentem against you**                                                  |
| Ukrainian law to escape all this                                    | **Fails**                                | **Art. 6(2) is explicit** (**PRIMARY**): consumer _"does not lose the protection"_ via non-Member-country law where there's a close connection   |

### What survives

1. **Simple-negligence exclusion for non-personal-injury damage** — the explicit gap in §309 no. 7(b). Most of the realistic exposure. Draft it precisely, not in an ALL-CAPS blob.
2. **The gratuitous character as a fairness argument** — Art. 3(1) "significant imbalance" and Art. 4(1) "nature of the services" are **contextual**. A user who paid nothing and can walk away costlessly has a weak imbalance story.
3. **⭐ Honest expectation-setting, which is legally operative.** DCD Art. 8(1)(b) measures conformity against what _"the consumer may **reasonably expect**, given the **nature**"_ of the service. **A clear "free hobby project, no SLA" moves the conformity benchmark itself** — strictly stronger than disclaiming. **Candour beats lawyering here.**
4. **UGC disclaimers** — you don't warrant user-authored pack accuracy.

### Realistic exposure: small

No money moves ⇒ the main consumer-claim generator is eliminated by construction. Damages need provable loss, and there's little. **93/13's real teeth are collective** (Art. 7(2) injunctions by consumer bodies) — _the realistic bad day is being told to rewrite the ToS, not being sued._ Entirely avoided by not shipping unfair terms.

**Art. 6(1) severs surgically** — an unfair term is _"not binding on the consumer"_ and the contract _"shall continue in existence without the unfair terms"_. A bad clause costs you that clause (except under the German no-reduction doctrine).

---

## 6. AUDIT — the live documents vs the code

`messages/en.json` — `terms` (13 sections), `privacy` (**12**, not 13). Dated `2026-07-15` (`legal-meta.ts:5`). **Mirrored into es/fr/pt — every fix propagates ×4** (and ×11 for the full catalog set).

**Headline: unusually clean of template residue, but materially incomplete. The failure mode is SILENCE.**

### A — FALSE / MISLEADING

| #         | Claim                                                                                                                                                                                         | Reality                                                                                                                                                                                                                                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1** 🚩 | `terms`: _"You must be at least 13 years old… **By using the service you confirm that you meet this requirement**"_; `privacy`: _"We do not knowingly collect… from children below that age"_ | **There is no age gate of any kind.** Grep for `dateOfBirth\|birthDate\|dob\|ageCheck\|ageGate\|minAge` across all three repos → **zero**. `register.dto.ts:22-40` is `.strict()`, accepting only `email, username, password, code, acceptedRules` — an age field **could not be submitted**. **Highest legal exposure.**                                              |
| **A2**    | `privacy`: _"request access to or deletion… **by contacting us**"_                                                                                                                            | **Both are self-serve buttons** (`DangerZoneSection`, `GET /users/me/export`, `DELETE /auth/account`). Wrong **in the user's disfavour**.                                                                                                                                                                                                                              |
| **A3**    | `terms`: _"You **may need to** verify your email **to unlock certain features**"_                                                                                                             | **Verification is mandatory _before the account exists_** (`register.dto.ts:27-31`). Not a feature unlock — the front door.                                                                                                                                                                                                                                            |
| **A4**    | `privacy`: _"…including a **session cookie** for authentication. We do not use them to track you across other websites."_                                                                     | Three problems: (1) **`NEXT_LOCALE` undisclosed** (`i18n/locale.ts`, **1 year**, not httpOnly); (2) **"session cookie" is wrong** — refresh is **30-day persistent**; (3) the no-cross-site-tracking line is **false of the page** — `YouTubeCard.tsx:143` embeds **`youtube.com`** (not `youtube-nocookie.com`) + `iframe_api` script + `img.youtube.com` thumbnails. |
| **A5**    | `privacy`: _"records of the packs you play"_ (unconditional)                                                                                                                                  | **Anonymous plays are never recorded.** `use-play-session.ts:180-194` + `JwtAuthGuard` on `POST /:id/plays`. **An anonymous visitor leaves zero server-side trace** — a _good_ story the policy fails to tell, while claiming collection that doesn't happen.                                                                                                          |
| **A6** 🚩 | `privacy`: _"We keep your information **for as long as your account is active**"_                                                                                                             | **The inverse of the truth.** Most data **outlives the account permanently by design**: comments/feedback/plays → **tombstoned**; votes → **retained with `userId=NULL`, counts preserved**; **AuditLog → forever**. And **nothing is ever pruned** — no cron deletes expired RefreshTokens, Notifications, PlayRecords, or AuditLogs.                                 |
| **A7**    | `privacy`: _"service providers… such as our hosting and media-storage providers"_                                                                                                             | Names **zero** processors. Actual: AWS S3+CloudFront, AWS SES, **Sentry (Germany)**, Cloudflare. Doesn't even gesture at error monitoring or email.                                                                                                                                                                                                                    |
| **A8**    | `terms`: _"Packs **may** be reviewed before or after publication"_                                                                                                                            | More definite both ways: **all** packs by non-trusted/non-staff are human-reviewed **before** publication; **trusted/staff bypass entirely** (`packs.service.ts:101-107`). The bypass is undisclosed.                                                                                                                                                                  |
| **A9**    | `terms`: _"**Automated filtering** and human moderation"_                                                                                                                                     | The blocklist is a **zod `.superRefine` at the controller boundary** — blocked submissions 400 and never reach the DB. Severity union is `'block'` only; `'flag-for-review'` is marked future work. It never sets pack status, files a report, or bans. **Every ban is a human action.**                                                                               |

### B — MATERIAL OMISSIONS (ranked)

1. **🚩 Sentry — undisclosed entirely.** Neither doc contains "error", "monitoring", "Sentry", or "diagnostic". Facts are **favourable**: `setUser({id, username})` with **email excluded at the type level** and asserted by test; **EU/Germany** (`ingest.de.sentry.io`); **`sendDefaultPii` unset ⇒ false** ⇒ no IP/cookies/headers/bodies; **no Replay, no profiling**; off in dev. ⚠️ But **no `beforeSend` scrubbing anywhere**, default breadcrumbs on (console, fetch URL+status, DOM clicks, navigation), and **request URLs carry pack/user ids**. _The only problem is that nobody is told._
2. **🚩 Deletion mechanics — undisclosed.** 30-day grace (`PURGE_GRACE_MS`), daily 3am purge cron, **reversible by simply logging in**, requires current password. **What survives**: the tombstone/anonymized set. **What's destroyed beyond the user**: their packs **hard-delete**, cascading away **other users'** comments, votes and plays on them.
3. **🚩 PATs — undisclosed in Terms.** Users authorize **third-party AI agents** to create/update/**delete** packs (and moderate, if staff). 5 scopes, no wildcard; `expiresInDays: null` ⇒ **never expires**. `velanto-mcp` is local stdio and **sends nothing to any AI vendor** — but _the user's chosen MCP client sees everything the tools read_. Terms should assign responsibility. _(Note: `GET /users/me/export` uses `JwtAuthGuard`, so a **PAT cannot export**.)_
4. **AWS SES / SMTP — undisclosed.** Exactly two emails, plain-text, **code only** (no username, no IP, no links) — privacy-clean content, wholly undisclosed processor. _(The SMTP sender **logs the recipient address** on every send.)_
5. **S3 + CloudFront; images are PUBLIC by URL.** No GET media route — CloudFront serves `publicBaseUrl/key` directly, **not presigned**: unguessable but unauthenticated, permanent once leaked, readable **before** moderation. **No malware/NSFW scanning.** ✅ **EXIF/GPS IS stripped** (`image-processor.ts:42-46` re-encodes; `.withMetadata()` never called) — _a good fact worth stating_, though it's an implicit side-effect that holds only until someone adds `.withMetadata()`.
6. **Human review + the audit log — Privacy silent.** 13 audited actions. **🚩 `meta` is the entire raw request body, unfiltered** (`audit.interceptor.ts:56`) — so `update_pack` stores **a full snapshot of the author's pack content on every edit, forever**, in a table that is never pruned and **survives the author's purge**. Staff can **substring-search** it. **Reports are not anonymous to moderators** (`reporterId` + username returned).
7. **localStorage/sessionStorage — undisclosed.** `velanto:accent`, `velanto:streamer-mode`, `velanto:pack-filters`, **`velanto:otp-sent:{email}`**, `velanto:last-play:{packId}`. ✅ Access token is **in-memory only, never persisted** — a good fact.
8. **No cookie banner exists at all** — grep confirms zero consent UI.
9. **Third-country transfers — undisclosed.** Actual: **Sentry EU** ✓, **AWS `eu-central-1`** ✓, CloudFront (global edge), Cloudflare. _(`.env.example` says S3 `us-east-1` but the real `.env` is `eu-central-1` — the example is stale.)_
10. **Export contents undisclosed**, and **not exported**: PersonalAccessToken, RefreshToken, MediaObject, CommentVote, AuditLog-as-actor, `bannedUntil`, `banReason`, `trusted`, `deletedAt` — relevant to any Art. 15 completeness claim.
11. Smaller: **no governing-law clause at all**; throttler keys on `req.ip` in memory for 60s; follow graph + notifications unmentioned; `acceptedRulesVersion` is an unmentioned consent record.

### C — TEMPLATE RESIDUE: notably clean

No `[Your Company]`, no lorem, no "Vilante", no payments/shipping/refunds boilerplate, no US CCPA/COPPA cruft. `admin@playvelanto.com` is real. **The residue is absence, not stale text:**

- **C1 🚩 No controller identity.** Everything either doc says about "we" is _"Contact us at admin@playvelanto.com."_ **No legal entity, no natural person, no address, no country.** `terms` says the agreement is _"between you and Velanto"_ — never defined as a legal person. **Art. 13(1)(a) requires identity; an email alone does not satisfy it.**
- **C2** No governing law / jurisdiction / venue.
- **C3** No Art. 13(2)(d) right to lodge a complaint; no supervisory authority named.
- **C4** **No legal basis stated for any processing.**
- **C5** Rights enumeration is a stub — access + deletion only.
- **C6** Terms has 13 sections; Privacy has **12**.

### D — TRUE, don't touch

UGC licence (non-exclusive, appropriately scoped, **no overreach**); third-party media clause; removal/ban rights; "you may stop using Velanto at any time"; argon2 password hashing (**never exported**); public-by-design profile/packs/comments; **play-history visibility opt-out** (a real, named opt-out); security description (argon2 + **single-use rotated refresh tokens with the presented token revoked before reissue** + helmet + `Permissions-Policy: browsing-topics=()`).

✅ **No analytics claimed — and confirmed there is none.** Grep for `google-analytics|gtag|posthog|mixpanel|plausible|umami|fathom|segment|hotjar|clarity|fbq|vercel/analytics|matomo|datadog|logrocket|fullstory|adsense|doubleclick` → **zero**. Fonts are `next/font/google` ⇒ **self-hosted at build**, no runtime Google request.

✅ **No special-category data / profiling — confirmed.** No health/religion/politics/orientation/ethnicity/biometric/gender/precise-location/DOB field. Popularity is **aggregate and viewer-independent**. No personalized feed. **The one automated decision is pack auto-approval for trusted/staff** — favourable, driven by a staff-set boolean, not profiling.

✅ **No IP address stored or logged — confirmed.** Grep for `req.ip|remoteAddress|x-forwarded-for|trustProxy|clientIp` → hits **only in test files**. No IP column anywhere. Fastify `logger:false`; no request logging. Sentry `sendDefaultPii` unset. _Only in-memory throttler contact._ **A strong story the policy doesn't tell.**

### E — Browser storage inventory (verified empirically, 2026-07-16)

| Key                            | Store              | Contents                                          | Verdict                                   |
| ------------------------------ | ------------------ | ------------------------------------------------- | ----------------------------------------- |
| refresh token                  | cookie             | session                                           | **30d persistent, httpOnly ✓** — see §4   |
| `NEXT_LOCALE`                  | cookie             | locale                                            | **1 year, not httpOnly** — undisclosed    |
| `velanto:accent`               | local              | accent hex                                        | UI pref                                   |
| `velanto:streamer-mode`        | local              | `"on"`                                            | UI pref                                   |
| `velanto:pack-filters`         | local              | feed filters JSON                                 | UI pref                                   |
| **`velanto:otp-sent:{email}`** | local              | **the user's email IS the key**; value = epoch-ms | 🚩 **60s cooldown, key persists forever** |
| `velanto:last-play:{packId}`   | session            | own picks                                         | exempt (user input)                       |
| access token                   | **in-memory only** | JWT 15m                                           | ✅ never persisted                        |
| **Sentry**                     | **writes nothing** | —                                                 | ✅ verified in browser; no Replay         |

_(Observed on a dev build; `__next_hmr_refresh_hash__` and `__next_debug_channel:*` are Next.js dev-only artifacts.)_

---

## 7. 🐛 CODE BUGS found en route (not policy issues — file these)

1. **🚩 GDPR ERASURE BUG: `EmailVerification` and `PasswordReset` survive account purge carrying the email.** Both are keyed by `email @unique` with **no FK to User**; the purge never touches them. A purge with a code in flight **leaves the address behind indefinitely.**
2. **`velanto:otp-sent:{email}` never cleaned up** — a 60-second cooldown writes the user's email into a localStorage key that persists forever, survives logout, and accumulates on shared computers.
3. **`DELETE /auth/account` never clears the refresh cookie** (unlike `logout`). Server-side inert, but it stays in the browser. Access tokens also stay valid ~15 min.
4. **`audit.interceptor.ts:56` stores unbounded raw request bodies forever** (`meta: request.body`), no allowlist/cap/redaction, never pruned, survives purge.
5. **Expired/revoked `RefreshToken` rows are never pruned** — zero `refreshToken.delete*` calls anywhere.

**✅ Security false alarm, resolved:** AWS credentials in `velanto-backend/.env` are **gitignored and were never committed** (`git log --all -- .env` empty; the `AKIA` hit in history is the `.env.example` placeholder). Frontend history is clean too. **No rotation needed on leak grounds.**

---

## 8. ❌ NOT RESEARCHED / NOT VERIFIED — do not fill in from this document

| Gap                                               | Status                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Children / GDPR Art. 8**                        | **Agent never reported.** Per-member-state digital age of consent (13–16), whether Art. 8 bites when the basis is **contract** not consent, age-assurance expectations, what the notice must say. **Re-run.**                                                                                                                     |
| **DSA (Reg. 2022/2065)**                          | **Agent never reported.** Does it bind a non-EU provider? Which obligations survive the micro/small exemption (Art. 19)? Notice-and-action (16), statement of reasons (17), complaint handling (20)? **Would convert moderation toward Art. 6(1)(c).** **Re-run — high value.**                                                   |
| **Ukraine law**                                   | Only: Law 2297-VI _«Про захист персональних даних»_ **in force**, ред. 14.06.2025 (text unretrievable, JS-gated). **Draft 8153 NOT adopted** — first reading 20.12.2023, still «Готується на друге читання» as of 2026-07-16. **⇒ the 2010 law governs.** Ombudsman notification, Arts. 8/9/12/24, penalties: **not researched.** |
| **EU-rep pricing / enforcement cases**            | **Nothing substantiable.** Re-run.                                                                                                                                                                                                                                                                                                |
| **French R. 212-1 6°**                            | **SECONDARY only** (Légifrance 403'd). Materially harsher than Germany — **verify before relying.**                                                                                                                                                                                                                               |
| **German no-blue-pencil doctrine**                | SECONDARY. Matters for severability.                                                                                                                                                                                                                                                                                              |
| **Rome I Art. 6 / Brussels Ia**                   | Not fetched. Relied on 93/13 Art. 6(2) instead (verified).                                                                                                                                                                                                                                                                        |
| **e-Commerce Directive identification duties**    | Not researched (likely inapplicable — binds EU-established providers).                                                                                                                                                                                                                                                            |
| **WP260 "postal address" gloss**                  | UNVERIFIED (Annex page has no text layer). Note it says _"preferably"_.                                                                                                                                                                                                                                                           |
| **26 of 27 Member States** on the liability floor | Only Germany verified.                                                                                                                                                                                                                                                                                                            |

---

## 9. Open questions for a lawyer (issue #204)

Ranked. **If only one hour is bought, spend it on 1 + 2 together** — they're linked (both turn on status), both launch-blocking.

1. **"Trader" status** under 93/13 / _Kamenova_ — open today, closes the moment of any monetisation or ФОП.
2. **Controller identity + Art. 27 representative** — who, which Member State, and whether a private individual is prudent (legally permitted, never adjudicated).
3. **Legal basis per activity** — esp. transactional email (6(1)(b) vs 6(1)(f)) and whether Sentry telemetry is _"exclusively for supplying"_ under DCD Art. 3(1).
4. **Art. 17(3)(a) free-expression carve-out** for retaining UGC after deletion — varies by Member State via Art. 85.
5. **Art. 14** for report/comment data about third parties — marginal; cheap to close voluntarily.
6. **Anonymised vote counts** — clean **only if** singling-out is impossible (Recital 26). Engineering question as much as legal.
7. **Persistent auth cookie** vs WP194 §3.2.
8. **Translation quality** — WP260 ¶13 requires translations not need "deciphering"; current ones are machine-made.

---

## 10. Key primary sources

- **GDPR authentic text** — Publications Office cellar: `http://publications.europa.eu/resource/celex/32016R0679` _(EUR-Lex UI is behind an Azure WAF; the cellar endpoint serves the same authentic OJ text by content negotiation)_
- **EDPB Guidelines 3/2018** (territorial scope, Art. 27) — `https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf` — **unnumbered prose; cite by page**
- **WP260 rev.01** (transparency) — `https://www.edpb.europa.eu/system/files/documents/2023-09/wp260rev01_en.pdf` — ⚠️ note the `/documents/` path; the commonly-cited URL 404s
- **EDPB Guidelines 05/2021** (Art. 3 ↔ Chapter V) — Example 2 is Velanto's exact shape
- **EDPB Guidelines 2/2023** (technical scope of Art. 5(3) ePrivacy)
- **WP194** (Opinion 04/2012, cookie consent exemption) — `https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2012/wp194_en.pdf`
- **Commission Notice 2019/C 323/04** (UCTD guidance) — CELEX `52019XC0927(01)`
- **CJEU C-105/17 _Kamenova_** — CELEX `62017CJ0105`
- **Dir. 93/13/EEC** — CELEX `31993L0013` · **Dir. (EU) 2019/770** — CELEX `32019L0770`
- **CNIL** — `cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ` + the recommandation consolidée
- **BGB** (official EN) — `gesetze-im-internet.de/englisch_bgb/englisch_bgb.html`
- **LOPDGDD** — BOE-A-2018-16673 consolidated
- _**Sanso Rondón v LexisNexis**_ [2021] EWHC 1427 (QB)

**⚠️ Retrieval note for future runs:** EUR-Lex, curia.europa.eu, Légifrance and gdprhub.eu all block automated fetching (WAF/JS/bot challenges). Route via the Publications Office cellar endpoint, national DPA mirrors, or courts' own PDFs.
