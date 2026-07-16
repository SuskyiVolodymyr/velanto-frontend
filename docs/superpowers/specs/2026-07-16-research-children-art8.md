# Research: Children, GDPR Art. 8, and an age gate for Velanto

Date: 2026-07-16. Status: IN PROGRESS (appended as established).
Context: Velanto — free elimination-quiz-pack site, solo operator established in Ukraine, EU users,
UI in 11 languages. No payments, ads, or analytics. Account = email/username/password.
No age gate exists today; owner wants a real one + a truthful stated minimum age.

Every claim is marked **PRIMARY** (regulation text, EDPB, a DPA, a court) or **SECONDARY**.
Anything not verified from a source is marked **UNVERIFIED**.
Vendor/compliance-tool marketing is excluded from conclusions.

---

## 1. GDPR Art. 8 — verbatim text

**PRIMARY (text of Regulation (EU) 2016/679; retrieved via gdpr-info.eu mirror — SECONDARY as to
the mirror, but the wording is the well-known official wording; EUR-Lex blocks automated fetch).**

> **Article 8 — Conditions applicable to child's consent in relation to information society services**
>
> 1. **Where point (a) of Article 6(1) applies**, in relation to the offer of information society
>    services directly to a child, the processing of the personal data of a child shall be lawful
>    where the child is at least 16 years old. Where the child is below the age of 16 years, such
>    processing shall be lawful only if and to the extent that consent is given or authorised by the
>    holder of parental responsibility over the child. Member States may provide by law for a lower
>    age for those purposes provided that such lower age is not below 13 years.
> 2. The controller shall make reasonable efforts to verify in such cases that consent is given or
>    authorised by the holder of parental responsibility over the child, taking into consideration
>    available technology.
> 3. Paragraph 1 shall not affect the general contract law of Member States such as the rules on the
>    validity, formation or effect of a contract in relation to a child.

Note the **two cumulative conditions** in para 1: (i) "Where point (a) of Article 6(1) applies"
— i.e. the legal basis is **consent** — AND (ii) the service is "offered directly to a child".

---

## 2. 🚩 THE CRUX — does Art. 8 apply when the basis is contract (Art. 6(1)(b))?

### The bright-line part

**PRIMARY — bright line.** Art. 8(1) is expressly conditioned: _"Where point (a) of Article 6(1)
applies"_. Point (a) of Art. 6(1) is **consent**. On the face of the text, Art. 8 does **not**
impose the 16/13 threshold or the parental-consent/verification duty on processing whose basis is
Art. 6(1)(b) (contract), (c) (legal obligation), or (f) (legitimate interests). Art. 8(3) reinforces
the separation: it says para 1 "shall not affect the general contract law of Member States such as
the rules on the validity, formation or effect of a contract in relation to a child" — i.e. the GDPR
deliberately leaves child-contract capacity to **national civil law**, and does not itself set a
contracting age.

So: **if Velanto's account really runs on Art. 6(1)(b), Art. 8's age threshold is not directly
triggered.** An age gate is then, as a matter of Art. 8, a **product/risk choice, not an Art. 8
obligation.** That is the honest answer to the question as posed.

### The parts that are NOT clean — read these before relying on the above

This is where a confident answer would be wrong. Four independent qualifications:

1. **Art. 8(3) cuts both ways — it is the trap, not the escape.** Contract is only a valid basis if
   there _is_ a contract. Capacity to contract is national civil law, and in most member states a
   minor below the age of majority (usually 18) cannot form a binding contract without
   parental/guardian authority — with exceptions for everyday, low-value transactions and, in some
   states, graduated capacity from ~14–16. If the minor cannot validly form the contract, the
   "necessary for performance of a contract" basis is shaky or void, and the controller falls back
   to... consent (which lands you back in Art. 8) or legitimate interests (which carries its own
   child-specific balancing, see below). **This is the single most important qualification** and it
   is why "we use contract, so Art. 8 doesn't apply" is not a complete answer.
   — Reasoning from PRIMARY text (Art. 8(3), Art. 6(1)(b)); the national-capacity specifics are
   **UNVERIFIED** per-country here (not researched country-by-country).

2. **Art. 6(1)(b) is narrow.** EDPB Guidelines 2/2019 on Art. 6(1)(b) for online services read
   "necessary for performance of a contract" strictly — it covers what is objectively necessary to
   deliver the service the user asked for, not everything the controller wants to do. Anything
   outside that (marketing, personalisation, optional profiling) needs its own basis, and if that
   basis is consent, **Art. 8 applies to that processing** even though the account itself sits on
   contract. So Art. 8 can bite for _part_ of the service. — **PRIMARY** (EDPB Guidelines 2/2019);
   citation to be confirmed below.

3. **Art. 8 is not the only child-protection rule in the GDPR.** Recital 38 states children "merit
   specific protection" of their personal data. Art. 6(1)(f) expressly names the interests of a data
   subject "in particular where the data subject is a child" as weighing in the balancing test.
   Art. 12(1) requires information addressed to a child to be in clear, plain language. Art. 57(1)(b)
   tasks DPAs with promoting awareness of risks specifically for children. **None of these are
   conditioned on the basis being consent.** So even with contract as the basis, a service that in
   fact has child users carries child-specific obligations — they just are not the Art. 8 age gate.
   — **PRIMARY** (GDPR text). **NOT RETRIEVED: Recital 38 verbatim.** EUR-Lex and the Publications
   Office cellar endpoint both defeated automated fetch (the cellar RDF object exceeded the 10 MB
   fetch limit). Recital 38's substance — that children merit specific protection because they may be
   less aware of risks, especially re marketing and profiling — is well known and relied on above, but
   **the exact wording was not verified here**. Confirm before quoting it anywhere.

4. **"Offered directly to a child" is the other cumulative limb, and it is a judgment call.** Even
   under a consent basis, Art. 8 only bites where the service is offered directly to children. A
   general-audience quiz site that plausibly attracts teenagers but is not aimed at them is a
   genuinely contested classification. **Judgment call, not a bright line.**

### Verdict on the crux

- **Bright line:** Art. 8's own text limits it to Art. 6(1)(a) processing. Contract basis ⇒ Art. 8's
  16/13 threshold is not directly engaged. This is uncontested on the text.
- **Judgment call / contested in practice:** whether Velanto can _sustain_ a contract basis against
  minors who lack contractual capacity, whether it is "offered directly to a child", and whether the
  regulator would view an age-gate-free general-audience service as meeting the Recital 38 /
  Art. 6(1)(f) / Art. 12 child-protection expectations regardless of Art. 8.
- **Practical consequence:** the "contract, therefore no Art. 8" argument is textually sound but
  **not a safe harbour**. It removes a specific obligation; it does not remove child-risk exposure.
  It is also not a position that has, so far as this research established, been squarely tested —
  see below.

**UNVERIFIED / NOT RESEARCHED:** whether any EDPB guidance, DPA decision, or CJEU judgment has
squarely addressed "contract basis ⇒ Art. 8 inapplicable" for a general-audience service. I searched
EDPB Guidelines 05/2020 (the leading consent guidance) for any discussion of Art. 6(1)(b) as an
alternative to Art. 8 and **found none** — the guidelines discuss contract only in the unrelated
Art. 7(4) "conditionality/bundling" context and in the Art. 17 erasure context. So the EDPB has,
so far as this research found, **not addressed the question at all**. Treat the absence of a citation
as an open question, not as confirmation of the textual reading.

### 2b. What EDPB Guidelines 05/2020 DOES say that bears on the crux

**PRIMARY — EDPB Guidelines 05/2020 on consent under Regulation 2016/679, v1.1, section 7.1**
(retrieved: https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf).

Two paragraphs matter a great deal here.

**§130 (scope — "offered directly to a child"). This is the most operationally useful sentence in
the whole document for Velanto:**

> "The inclusion of the wording 'offered directly to a child' indicates that Article 8 is intended to
> apply to some, not all information society services. In this respect, if an information society
> service provider makes it clear to potential users that it is only offering its service to persons
> aged 18 or over, and this is not undermined by other evidence (such as the content of the site or
> marketing plans) then the service will not be considered to be 'offered directly to a child' and
> Article 8 will not apply."

Note the structure: a **stated minimum age can take you out of Art. 8's scope** — but only if it is
"not undermined by other evidence (such as the content of the site or marketing plans)". A stated age
that the site's own content contradicts does not work. This is the regulator telling you that the
**stated age must be truthful and consistent with the product** — which is exactly what the owner has
already decided to do. (EDPB frames this at 18+; it does not say whether a stated 16+ or 13+ has the
same scope-excluding effect. **UNVERIFIED** for ages below 18.)

**§132 (confirms the consent-conditionality reading):**

> "When providing information society services to children **on the basis of consent**, controllers
> will be expected to make reasonable efforts to verify that the user is over the age of digital
> consent, and these measures should be proportionate to the nature and risks of the processing
> activities." (emphasis added)

The EDPB thus consistently frames the Art. 8 duty as attaching to consent-based provision, which
**supports** the textual reading in §2 above. It stops short of saying "therefore contract-based
services are exempt" — it simply never addresses the alternative. That silence is the honest state
of the guidance.

**§131 (cross-border — important for Velanto's 11-language EU-facing service):**

> "The controller must be aware of those different national laws, by taking into account the public
> targeted by its services. In particular, it should be noted that a controller providing a
> cross-border service cannot always rely on complying with only the law of the Member State in which
> it has its main establishment but may need to comply with the respective national laws of each
> Member State in which it offers the information society service(s). This depends on whether a
> Member State chooses to use the place of main establishment of the controller as a point of
> reference in its national law, or the residence of the data subject."

**This is a real complication for Velanto and it is worse than for an EU-established operator.**
Velanto is established in **Ukraine** — a third country. It has **no EU main establishment**, so the
one-stop-shop mechanism (Art. 56) is unavailable and there is no lead supervisory authority to
consolidate with. A Ukraine-established controller targeting EU users falls under GDPR via Art. 3(2)
(targeting), and is answerable to the DPA of **each** member state whose residents it targets, with
Art. 27 (EU representative) potentially in play. Practically: if Art. 8 _were_ engaged, Velanto could
not pick one age — it would face the residence-based patchwork in §3 below. That asymmetry is a
significant argument in favour of a single high flat age if a consent basis is ever adopted.
(Art. 3(2)/27/56 reasoning is **PRIMARY** as to the text; the "no lead SA for third-country
controllers" conclusion is well-established but the specific citation is **UNVERIFIED** here.)

---

## 3. Per-member-state age table (13/14/15/16)

### ⚠️ Read this caveat before using the table

I could **not** obtain an authoritative, current, official per-state table. The EU has no single
official register of Art. 8 national choices, and EUR-Lex/national gazettes block automated fetch.
The best source retrieved is **euConsent** (https://euconsent.eu/digital-age-of-consent-under-the-gdpr/),
**published 26 October 2021** — an EU-co-funded project, but this page is **SECONDARY, ~5 years stale,
and demonstrably self-inconsistent** (it lists **Croatia under both 14 and 16**, and lists Slovenia as
"16, proposal pending 15"). It also still includes the **UK**, which post-Brexit is not a member state.
At least one entry is known to have changed since: **Slovenia's ZVOP-2 (2023)** post-dates the page.

**Do not rely on the table below for a legal decision without re-verifying the specific country
against its national law.** Reproduced only to show the shape of the fragmentation.

| Age                       | Member states (per euConsent 2021 — SECONDARY, STALE, verify before use)                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **13**                    | Belgium, Denmark, Estonia, Finland, Latvia, Malta, Portugal, Sweden                                                                                |
| **14**                    | Austria, Bulgaria, Cyprus, Italy, Lithuania, Spain                                                                                                 |
| **15**                    | Czechia, France, Greece                                                                                                                            |
| **16**                    | Germany, Hungary, Ireland, Luxembourg, Netherlands, Poland, Romania, Slovakia                                                                      |
| **Conflicting / changed** | **Croatia** (source lists both 14 and 16 — UNRESOLVED); **Slovenia** (listed 16 with a pending 15; ZVOP-2 2023 post-dates the source — UNVERIFIED) |

National law citations given by the source (SECONDARY, unverified): Belgium Act of 30 July 2018;
Denmark Act No. 502/2018; Finland Data Protection Act 1050/2018; Sweden Act 2018:218; Portugal Law
58/2019; Spain LO 3/2018 (LOPDGDD); Italy Legislative Decree 196/2003 as amended; France Act
78-17 of 6 Jan 1978; Czechia Act 110/2019 Coll.; Greece Law 4624/2019; Cyprus Law 125(I)/2018.

**The load-bearing point survives the uncertainty:** the spread is real and runs the full 13→16 range,
and per EDPB §131 a cross-border controller may have to honour the **residence-based** age of each
member state it targets. **UNVERIFIED:** which states use residence vs. main-establishment as the
connecting factor — this was not researched per-country and materially affects option (b) in §5.

**Relevant development (SECONDARY):** the European Commission has been reported as considering
amending the GDPR to harmonise the digital age of consent (Future of Privacy Forum). Not law; noted
only so the fragmentation is not assumed permanent. **UNVERIFIED** as to status.

---

## 4. Age assurance expectations — is self-declaration enough?

### Short answer

**For a genuinely low-risk service, yes — a self-declared date of birth is defensible, and the
regulators say so in terms.** The standard explicitly scales with risk. But note the framing: the
sources below describe what "reasonable efforts" means **when Art. 8 applies** (consent basis). If
Velanto's basis is contract, this is the standard it would be measured against _if_ a regulator
disagreed with the contract analysis — i.e. it is the fallback, and it is a forgiving one.

### PRIMARY — EDPB Guidelines 05/2020, §132, §135, §137

§132 — the duty and its proportionality in one sentence:

> "When providing information society services to children on the basis of consent, controllers will
> be expected to make reasonable efforts to verify that the user is over the age of digital consent,
> and these measures should be **proportionate to the nature and risks of the processing activities**."

§135 — **this is the direct answer to the question, and it endorses exactly the year-of-birth /
form approach**:

> "Age verification should not lead to excessive data processing. The mechanism chosen to verify the
> age of a data subject should involve an assessment of the risk of the proposed processing. **In some
> low-risk situations, it may be appropriate to require a new subscriber to a service to disclose
> their year of birth or to fill out a form stating they are (not) a minor.** If doubts arise, the
> controller should review their age verification mechanisms in a given case and consider whether
> alternative checks are required."

The EDPB's own footnote 65 to that sentence is candid about its limits, and worth quoting because it
sets the honest expectation:

> "Although this may not be a watertight solution in all cases, it is an example to deal with this
> provision."

§137 — risk scaling of parental-consent verification:

> "What is reasonable ... may depend upon the risks inherent in the processing as well as the
> available technology. **In low-risk cases, verification of parental responsibility via email may be
> sufficient.** Conversely, in high-risk cases, it may be appropriate to ask for more proof..."

§133 — note the permissive verb, "**can**", not "must":

> "If the users state that they are over the age of digital consent then the controller **can** carry
> out appropriate checks to verify that this statement is true. Although the need to undertake
> reasonable efforts to verify age is not explicit in the GDPR it is implicitly required, for if a
> child gives consent while not old enough to provide valid consent on their own behalf, then this
> will render the processing of data unlawful."

§134 — the asymmetry that matters for UX design:

> "If the user states that he/she is below the age of digital consent then the controller **can accept
> this statement without further checks**, but will need to go on to obtain parental authorisation..."

### PRIMARY — EDPB Statement 1/2025 on Age Assurance (adopted 11 Feb 2025, v1.2 as of 1 Apr 2025)

Retrieved: https://www.edpb.europa.eu/system/files/2025-04/edpb_statement_20250211ageassurance_v1-2_en.pdf
This is the **most current** EDPB guidance and it post-dates Guidelines 05/2020. It treats
"age assurance" as an umbrella of three categories: **age estimation, age verification, and
self-declaration** — i.e. self-declaration is a recognised method, not a non-method.

The single most important sentence for Velanto, on self-declaration's weakness — **note carefully how
it is scoped**:

> "It should be noted that **robustness has little meaning in the context of the self-declaration** of
> an age-related attribute, since the reliability of such method depends mostly on the goodwill of the
> user." (§22(c))

and its footnote 24:

> "The EDPB has previously expressed **serious doubts as to the effectiveness of self-declaration as a
> method of age verification within the context of high-risk processing** in the Binding Decision
> 2/2023 ... regarding TikTok Technology Limited (Art. 65 GDPR)."

**This is a favourable finding for Velanto, and the scoping is the whole point.** The EDPB's stated
doubts about self-declaration are expressly confined to **high-risk processing**, and its cited
authority is **TikTok** — a service with profiling, ad targeting, public-by-default teen accounts and
recommender feeds. Velanto is close to the opposite: no payments, no ads, no analytics, no profiling.
Nothing retrieved suggests the EDPB regards self-declaration as inadequate for a low-risk service;
Guidelines 05/2020 §135 affirmatively endorses it there.

Also load-bearing — the EDPB warns against **over**-doing it (§19–20, §23):

> "The controller should therefore only collect personal data that are necessary, adequate, and
> relevant for the purposes that are intended to be served. In this way, data minimisation helps to
> substantiate and operationalise the principles of necessity and proportionality. For example, the
> service provider **may only need to know whether the user is over or under an age threshold**."

> "Service providers must ensure that they have an applicable legal basis under Article 6 GDPR ... to
> process personal data **in the context of age assurance** ... taking into account that **age
> assurance must be proportionate to the legitimate objective pursued**."

**Do not miss the reflexive point:** the age check is itself processing needing its own basis and its
own minimisation. Collecting full DOB, or ID documents, for a quiz site would be its **own** GDPR
problem. A heavier gate is not a safer gate. The EDPB also flags that fully automated age assurance
can engage Art. 22 and requires redress routes for users wrongly assessed (§27–29) — another reason a
small operator should not reach for age-estimation tech.

### PRIMARY — CNIL (French DPA), Recommendation 7

Retrieved: https://www.cnil.fr/en/recommendation-7-check-age-child-and-parental-consent-while-respecting-childs-privacy

> "if an online service is low risk, a **self-declaration method alone may be sufficient**"

CNIL contrasts this with higher-risk processing (e.g. targeted advertising to children), where
"the use of self-declaration methods alone should be avoided", and warns that
"a mechanism using facial recognition would therefore be disproportionate" — recommending assessment
against "the proposed purposes of the processing, the target audiences, the data processed, the
technologies available and the level of risk associated."

**A DPA saying self-declaration alone may suffice for low-risk is about as close to a green light as
this area gets.**

### Comparative only — UK ICO ⚠️ DIVERGED, DO NOT TREAT AS EU LAW

The ICO's Age Appropriate Design Code (Children's Code) is often cited as the reference standard, and
much of the "risk-proportionate age assurance" vocabulary traces to it. **But the UK is no longer a
member state and UK law has diverged**: the **Data (Use and Access) Act 2025** changed the UK regime,
and the UK's separate Online Safety Act 2023 imposes "highly effective age assurance" duties that have
**no EU equivalent** and do not apply to Velanto. **Treat ICO material as persuasive comparative
background only — it is not evidence of what EU law requires.** The specific effects of the DUAA 2025
on the Children's Code were **not researched** here — **UNVERIFIED**.

### Bright lines vs judgment calls (§4)

- **Bright line:** the standard is explicitly risk-proportionate, in the EDPB's own words. Low-risk →
  self-declaration is endorsed (Guidelines 05/2020 §135; CNIL).
- **Bright line:** you may not collect excessive data to run the check (Art. 5(1)(c); Statement 1/2025).
- **Bright line:** a stated under-age answer must be honoured without further checks (§134).
- **Judgment call:** whether Velanto is "low risk". User-authored packs + comments = user-generated
  content, which is the one feature that pushes upward (cf. WP29's unmonitored-chat-room example).
  Velanto's lack of ads/analytics/profiling/payments pushes strongly down. On balance low-risk, but
  this is an assessment the operator must actually make and record, not assume.
- **Judgment call:** what "if doubts arise" (§135) obliges you to do — i.e. if you _know_ under-age
  users are present, the endorsement of bare self-declaration starts to erode.

---

## 5. What minimum age should Velanto set? (trade-offs, NOT a verdict)

This is a **product decision**, not a legal one — see §2: on the text, Art. 8 does not compel any
particular age for a contract-based service. What follows is the trade-off map. **No recommendation is
given; the operator chooses.**

### Option (a) — 16+ globally

- **For:** Highest-ceiling member state age, so it is above every national Art. 8 threshold
  simultaneously — **no per-country logic ever needed**. Given Velanto has **no EU establishment** and
  thus **no lead SA / one-stop-shop** (§2b), and would otherwise face 27 residence-based rules, this
  is by far the simplest defensible posture. Also engages EDPB Guidelines §130 logic most strongly:
  a clear, consistently-applied stated minimum is what takes a service out of "offered directly to a
  child".
- **Against:** Excludes the 13–15 cohort, who are plausibly a meaningful share of a quiz site's
  natural audience — a real product cost, paid to avoid a legal risk that (on the contract analysis)
  may not exist. It is also **stricter than the law requires in 19 of 27 member states**. Arguably
  over-restrictive relative to actual risk, and the EDPB's own proportionality logic cuts against
  gold-plating. Excluding teens does not make them go away; it makes them **lie**, which is worse
  than an accurate 13+ record (see §6).
- **Note:** 16+ does **not** solve contractual capacity — majority is 18 in most member states, so a
  16-year-old still cannot fully contract. 16+ narrows the gap; it does not close it.

### Option (b) — 13+ with member-state variation (honour each country's real age)

- **For:** Most legally precise if a consent basis is ever adopted; maximises reach where the law
  permits; exactly what EDPB §131 contemplates for cross-border services.
- **Against:** **Heaviest by far to build and maintain for a solo operator.** Requires determining
  each user's country (itself processing — and IP geolocation is unreliable and adds data),
  maintaining a 27-row table against changing national law (which §3 shows is hard to even _source_
  accurately), and resolving the residence-vs-establishment connecting factor per state (**UNVERIFIED**
  — §3). A stale or wrong table is arguably worse than no table: it looks like a compliance control
  while silently failing. High ongoing burden, and it buys precision that only matters if the
  contract analysis fails.

### Option (c) — 13+ flat

- **For:** Simplest to build and explain. 13 is the **GDPR floor** — no member state may go below it
  (Art. 8(1)), so 13 can never be _under_-inclusive relative to any national Art. 8 age. Maximises
  audience. Matches the de-facto industry convention (below).
- **Against:** **This is the option whose weakness is most often misunderstood, so state it plainly.**
  13 is the floor _for what states may choose_, not a safe harbour. In a **16-age member state**
  (Germany, Netherlands, Ireland, Poland...), a 13-year-old is **below** the local digital age of
  consent. So if the contract basis fails, or if any part of the service moves to a consent basis
  (§2 qualification 2), a flat 13+ leaves you accepting users whom several member states say cannot
  consent without a parent — the exact exposure the whole exercise is meant to avoid. Flat 13+ is
  therefore the option most **dependent on the contract analysis being right**.

### Comparable small platforms (SECONDARY / general knowledge — LOW CONFIDENCE)

**⚠️ I did not research this systematically and have no primary source. Treat as impression, not
evidence.** The common convention among general-audience social/UGC services is **13+ globally**,
with **16+ applied only in EU states that require it** — a hybrid of (b) and (c). This convention is
substantially driven by the **US COPPA** floor of 13 (which does not apply to Velanto unless it
targets US children — **not researched**), not by an EU-law judgment. **Do not treat "everyone does
13+" as legal cover:** those platforms are ad-funded and profiling-driven (i.e. exactly the
high-risk posture the EDPB criticised in TikTok), and they have legal teams and DPAs engaged. Their
choice reflects their economics, not Velanto's risk profile. **UNVERIFIED.**

### The honest framing of the decision

The real question is **not** "what does the law require" — on the contract analysis, it requires no
specific age. It is: **how much of the 13–15 audience is the operator willing to give up in exchange
for how much reduction in a risk that may already be low?** A defensible, documented choice at any of
13/15/16 is likely fine for a service with this risk profile. What is **not** defensible is a stated
age that the product contradicts (EDPB §130), or a stated age the operator does not actually enforce
in code.

---

## 6. What the notice must say, and the deletion question

### 6a. What the notice must say about children

**PRIMARY — GDPR Arts. 12–13, Recital 58.** There is **no GDPR provision that mandates a
"children" section in a privacy notice** as such. The obligations are:

- **Art. 12(1)** — information must be "concise, transparent, intelligible and easily accessible
  form, using clear and plain language, **in particular for any information addressed specifically to
  a child**". **This applies regardless of legal basis.** If Velanto states a minimum age of 13, it
  is by its own admission addressing teenagers, and the notice must be readable by one. An 11-language
  notice written in EU-legalese does not meet this for a 13-year-old. **This is the single most
  commonly missed obligation here** and it is a drafting problem, not a legal one.
- **Art. 13(1)(c)** — must state purposes and **legal basis**. If Velanto relies on Art. 6(1)(b), the
  notice must **say so** — and this matters doubly here, because the whole "Art. 8 doesn't apply"
  position rests on that basis being real and declared. A notice that says "by using this service you
  consent" while the operator internally relies on contract **destroys the argument in §2**. The
  notice and the analysis must match.
- **EDPB Statement 1/2025 §24–25 (PRIMARY)** — if any age assurance processing happens, users must be
  told what data it uses, who is involved, retention, and their rights; and
  > "Service providers must ensure that they convey transparency information to children, when
  > concerned, in a way that is clear and easy for them to understand."

**Practical content for the notice (judgment, not mandated):** state the minimum age plainly; state
that accounts below it are not permitted; say what happens if an under-age account is found; say what
the DOB/age answer is used for and that it is not used for anything else; keep it in plain language.

**Consistency is the load-bearing bit:** per EDPB §130, a stated age only helps if it is "not
undermined by other evidence (such as the content of the site or marketing plans)". Stating 16+ while
the homepage is styled for teenagers is worse than useless — it is evidence of a knowing mismatch.

### 6b. If an under-age user is discovered, must you delete?

**Nuanced. There is no free-standing "delete children on sight" rule in the GDPR.** The answer runs
through the ordinary erasure provisions:

- **Art. 17(1)(d) (PRIMARY)** — erasure is required where "the personal data have been unlawfully
  processed". **This is the operative hook.** If the account's processing had no valid legal basis
  (e.g. consent invalid for want of Art. 8 parental authorisation, or contract void for want of
  capacity), the processing is unlawful and **erasure is an obligation, not a courtesy** — and it is
  triggered _by the controller's knowledge_, not only by a request. EDPB Guidelines 05/2020 §133
  makes the unlawfulness explicit: if a child consents while too young, "this will render the
  processing of data unlawful".
- **Art. 17(1)(f) + Art. 8(1) (PRIMARY)** — erasure where data were "collected in relation to the
  offer of information society services referred to in Article 8(1)". **Note this is expressly tied
  to Art. 8(1)** — i.e. to consent-based offers. On the contract analysis this limb does not engage;
  the (1)(d) route is the one that matters.
- **Recital 65 (PRIMARY, SECONDARY as to retrieval)** — the "right to be forgotten" is described as
  of particular relevance where consent was given as a child. The GDPR's concern is that childhood
  data should not follow people; it reinforces the direction of travel.
- **EDPB Guidelines 05/2020 §119 (PRIMARY)** — and this is the sentence that answers the question
  directly: controllers
  > "are obliged to assess whether continued processing of the data in question is appropriate, **even
  > in the absence of an erasure request by the data subject**."

**So the honest answer:** if Velanto's basis is contract and it holds up, there is **no automatic
deletion duty** simply because a user turns out to be 12 — but the operator cannot then just carry on,
because if the basis _doesn't_ hold for that user (capacity — §2 qualification 1), the processing is
unlawful and Art. 17(1)(d) bites. **The practical upshot is the same either way: on actual knowledge
of an under-age user, act — close/delete the account, or obtain parental authorisation.** Continuing
to knowingly serve a user below your own stated minimum is the worst posture available: it is the
"other evidence" that undermines the stated age (EDPB §130), it converts a judgment call into a
knowing one, and it makes the §135 self-declaration defence untenable ("if doubts arise...").

- **Bright line:** unlawfully-processed data must be erased (Art. 17(1)(d)); you must assess even
  without a request (§119).
- **Judgment call:** how hard you must look. **Nothing retrieved imposes a duty to go hunting for
  under-age users.** The duty crystallises on knowledge or reasonable doubt — you need a working
  report/complaint route, not a surveillance programme.

---

## 7. Ukraine's own law — additional obligations on minors?

**Status: PARTIALLY RESEARCHED — the primary source was unretrievable, as anticipated.**

`zakon.rada.gov.ua` **failed at the DNS level** from this environment (`getaddrinfo ENOTFOUND`) — not
merely JS-gated. **I could not read Law 2297-VI «Про захист персональних даних» (ред. 14.06.2025) in
its current consolidated form. Its children-related content is therefore NOT VERIFIED from primary
source.**

What secondary sources indicate (**SECONDARY — DLA Piper Data Protection Laws of the World,
DataGuidance, ICLG Ukraine chapter; NOT verified against the statute; treat as a lead to confirm, not
as a finding**):

- Law 2297-VI **contains no provisions specific to children** — no digital age of consent, no
  Art. 8 analogue. **UNVERIFIED**, and note this claim is especially exposed to staleness given the
  14.06.2025 revision, which none of the retrieved sources clearly post-dates.
- Children's data is instead handled through **general civil law**: parents/guardians act for minors,
  including giving consent.
- **Civil Code of Ukraine Art. 32** gives ages **14–18 limited legal capacity** — able to enter minor
  everyday contracts alone; other contracts need parental consent. Sources note it is **"unclear
  whether this extends to giving valid consent for data processing"** — an acknowledged open question
  in Ukrainian law, not a settled rule. **UNVERIFIED.**
- A **draft data protection bill** (aligning Ukraine with the GDPR, in the EU-accession context) would
  reportedly introduce: consent from **14+** directly, parental consent below 14, and a ban on direct
  marketing/profiling aimed at under-14s. **Draft, not in force. UNVERIFIED.** Worth tracking — if
  enacted it would give Ukraine a **14** threshold, which sits inside the EU 13–16 band and would make
  a 14+ or higher choice convenient across both regimes.

**Interesting convergence, flagged tentatively:** if the Civil Code Art. 32 age of 14 and the draft
bill's 14 both hold, then **14 is Ukraine's natural line** — and 14 is also within the EU band. This
is a genuinely useful data point for §5 **if it verifies**. It currently does not.

**To close this gap:** open `https://zakon.rada.gov.ua/laws/show/2297-17` in a real browser
(the site defeats automated fetch), and read Civil Code Art. 32 directly. A Ukrainian-qualified
lawyer should confirm the data-consent-capacity question, which sources agree is unsettled.

---

## 8. Summary of the key judgments

| Question                                     | Answer                                                                                                              | Confidence                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Does Art. 8 apply on a contract basis?       | **No, on the text** — Art. 8(1) is expressly conditioned on Art. 6(1)(a)                                            | **Bright line on text**; but see caveats — **untested**, and EDPB never addresses it |
| Is an age gate legally required for Velanto? | **Not by Art. 8**, on the contract analysis. It is a **product choice**                                             | Judgment call                                                                        |
| Is the contract basis a safe harbour?        | **No.** Minors' contractual capacity (Art. 8(3) → national law) may undermine it                                    | **Judgment call — the main weak point**                                              |
| Is self-declared DOB enough?                 | **Yes for low-risk** — EDPB §135 and CNIL say so expressly; EDPB's doubts are scoped to high-risk/TikTok            | **PRIMARY-backed**, high confidence                                                  |
| Should the gate be heavier?                  | **No** — heavier gates create their own minimisation/Art. 22 problems (Statement 1/2025)                            | PRIMARY-backed                                                                       |
| Which minimum age?                           | **Operator's call.** 16 = simplest & safest; 13 = max reach but leans hardest on the contract analysis              | Product decision                                                                     |
| Must you delete under-age users?             | **Not automatically**, but on knowledge you must act (Art. 17(1)(d); EDPB §119)                                     | Bright line once known                                                               |
| Ukraine extras?                              | **NOT VERIFIED** — primary source unreachable; secondary says no child-specific rules, 14 in civil law + draft bill | **Gap**                                                                              |

### Biggest risks in this memo

1. **The contract analysis is textually sound but untested and load-bearing.** Everything permissive
   here depends on it. It has not been endorsed by EDPB, any DPA, or any court so far as this
   research found. Do not present it to anyone as settled.
2. **The member-state table is stale and self-contradictory** and must not be relied on as-is.
3. **Ukraine is a genuine gap.**
4. This is **research, not legal advice.** A solo operator making a launch decision on children's data
   for an 11-language EU-facing service should get the contract-basis question in §2 reviewed by a
   qualified EU data protection lawyer — it is precisely the kind of question where a confident
   self-assessment is most dangerous, and it is cheap to ask relative to the downside.
