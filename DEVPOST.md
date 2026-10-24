# Devpost submission draft

Copy each section into the matching Devpost field. Replace anything in <!-- comments -->.

**Project name:** CareSheet

**Tagline (max ~200 chars):** Hospital discharge papers and the pill bottles at home, turned into a verified weekly medicine plan and a bilingual fridge sheet. Claude reads; code checks every dose.

**Tracks to select:** Anthropic: Claude for Public Benefit · Cal Hacks: Best People-First Social Impact Hack · Microsoft: Built for the Real World · Meta: Bringing People Closer Together with AI · MLH: Commit Fellowship (also submit their supplemental form) · Hacker's Choice

**Links:** Live app https://caresheet.vercel.app · Finished example https://caresheet.vercel.app/?example · Code https://github.com/yuvie123/caresheet · Video <!-- VIDEO_URL -->

---

## Inspiration

<!-- TEAM: replace this paragraph with your real story, in your own words. -->
When an elderly parent comes home from hospital, an adult child usually ends up running the pills. The discharge papers list new medicines, changed doses, and medicines to stop, in clinical English. The kitchen still has the old bottles, sometimes under brand names that hide the fact they're the same drug. For families where the parent reads Punjabi or Hindi or Spanish instead of English, every instruction has to pass through one tired person. About one in five medical patients has an adverse event in the first weeks after discharge, and about two thirds of those are drug-related.

## What it does

You paste the discharge text, or just photograph the pages and the pill bottles. CareSheet gives you:

- **This week**, laid out like a pill organizer: times of day by days, with "for 5 days" medicines ending on day 5.
- **A Stop list first**, because medicines the hospital stopped are the easiest to keep taking by mistake.
- **Ask your pharmacist**: every duplicate (Tylenol and acetaminophen, checked against NIH RxNorm), every sheet-vs-bottle mismatch, every smudged or conflicting dose, each with the exact words from the papers.
- **A bilingual fridge sheet** in Punjabi, Hindi or Spanish, with tick boxes for each dose of the week, and a second page for the pharmacy counter.
- **Phone reminders**, a WhatsApp summary for siblings, read-aloud with the phone's own voice, and plain-language drug information from MedlinePlus.

## How we built it

Next.js on Vercel, with Claude (`claude-sonnet-5-5`) through the Anthropic SDK's structured outputs, so every answer arrives in a fixed shape with a verbatim source quote for each medicine.

The core idea is **Claude reads, code verifies**. After Claude extracts the plan, plain TypeScript checks every medicine: the quoted sentence has to exist in the transcript, and the dose digits have to sit next to the medicine's name. Anything that fails gets one retry with the exact failures fed back; anything that still fails is kept off the schedule and becomes a pharmacist question; items the papers leave unclear stay visible with a "Confirm first" badge and get no phone reminders. Each medicine is then resolved to its active ingredient through the NIH RxNav API to catch the same drug under two names.

Translation only touches words. Every number on the fridge sheet is printed by code from structured fields, and a translation that introduces a new number (in any script: Gurmukhi ੫, Devanagari ५, Arabic-Indic ٥) is rejected and English is shown instead.

We measured it with an eval suite of fictional discharge sheets with known answers, including phone photos, a smudged dose, a blood thinner listed twice, a sheet-vs-bottle mismatch, and a hidden prompt injection. Result: 7 of 7 test cases fully correct, 0 invented medicines, median 8 seconds per sheet.

## Challenges we ran into

- **Strict vs. useful checking.** Our first verifier was so strict that every run needed a retry: hospital sheets write "Atorvastatin - dose increased. Now take 40 mg", and bottle labels put the brand and strength on separate lines. We loosened it carefully (dose digits must sit on the line naming the medicine, or the next one) and added tests proving an invented dose is still rejected.
- **Drug databases are messy.** Our first RxNorm query asked for combination products and flooded the screen with ninety "duplicates" (every drug ever combined with acetaminophen). Asking only for ingredients fixed it, and we wrote tests so it can't come back.
- **Fitting a fridge.** Getting STOP, three times of day, durations and tick boxes onto one printed page in two scripts took several rounds of print-to-PDF checks.
- **Venue Wi-Fi** at about 80 KB/s, so we kept dependencies to a minimum.

## Accomplishments we're proud of

- Zero invented medications across the eval suite, with the injection case caught and reported.
- A fridge sheet a grandparent can read, with numbers that a translation physically cannot change.
- Nothing is stored: no accounts and no database. Papers go to the Claude API to be read, and medicine names to NIH RxNav and MedlinePlus.

## What we learned

The most useful thing Claude did wasn't writing text; it was turning a messy page into structured data that ordinary code could check. Designing where the model is allowed to be wrong, and what happens when it is, mattered more than the prompt.

## What's next

A two-week pilot with a hospital family-liaison program or a gurdwara seniors' group, measuring missed or doubled doses at the first follow-up visit; pharmacist review mode; FHIR import from patient portals; translations reviewed by native-speaking pharmacists.

## Production readiness

- **Cost:** roughly 3 to 6 US cents per sheet at current Sonnet pricing (a labelled estimate; the app logs token usage so it can be measured exactly).
- **Quality gate:** a release must score zero invented medicines on the eval set; `pnpm eval` is the check.
- **Human in the loop:** the "Pharmacist has gone through this sheet" sign-off on the printout, and a pharmacist-review mode before a plan is shared, are the next step.
- **Data:** a business associate agreement and zero data retention before any real patient data; no document contents in logs (the app already logs error types only).
- **Regulatory stance:** CareSheet reorganizes the hospital's own text and flags inconsistencies; it never recommends, changes or interprets a dose. Drug information shown comes from MedlinePlus, not from Claude.
- **Translations:** machine-made and unreviewed; native-speaking pharmacists must review each language before families rely on them. Numbers are never translated, only words.
- **Not yet tested:** real handwriting, non-English source papers, and real families. The eval set is fictional.

## Built with

`next.js` `typescript` `react` `tailwindcss` `anthropic` `claude` `zod` `rxnorm` `medlineplus` `vercel` `vitest`
