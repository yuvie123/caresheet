# Devpost submission draft

Copy each section into the matching Devpost field. Replace anything in <!-- comments -->.

**Project name:** CareSheet

**Tagline (max ~200 chars):** Hospital discharge papers and the pill bottles at home, turned into a verified weekly medicine plan and a bilingual fridge sheet. Claude reads; code checks every dose.

**Tracks to select:** Anthropic: Claude for Public Benefit · Cal Hacks: Best People-First Social Impact Hack · Microsoft: Built for the Real World · Meta: Bringing People Closer Together with AI · MLH: Commit Fellowship (also submit their supplemental form) · Hacker's Choice

**Links:** Live app https://caresheet.vercel.app · Finished example https://caresheet.vercel.app/?example · Code https://github.com/yuvie123/caresheet · Video <!-- VIDEO_URL -->

---

## Inspiration

Picture the evening a parent comes home from hospital. The discharge papers run to several pages of clinical English: two new medicines, one changed dose, two to stop. The kitchen cabinet still holds the old bottles, one under a brand name that hides the fact it is the same drug as something on the new list. The parent reads Punjabi, not English, so every instruction has to pass through a tired son or daughter who is also trying to work out which pills go where, and when. (This is an illustrative scenario, not a specific family.)

That ordinary evening is where doses get doubled and stopped medicines quietly keep being taken. About one in five medical patients has an adverse event in the first weeks after discharge, and about two thirds of those are drug-related. We built CareSheet for that evening: a plan every line of which traces back to the hospital's own words, with anything uncertain handed to the pharmacist instead of guessed, and a sheet for the fridge in the parent's language.

<!-- Optional: if a teammate has a true personal experience and is happy to share it, add one real sentence here. Do not add one that is not true. -->

## What it does

You paste the discharge text, or just photograph the pages and the pill bottles. CareSheet gives you:

- **A daily routine** for the day you pick (Day 1 to 7): Morning, Midday, Evening and Bedtime, with "for 5 days" medicines ending on day 5. Tap any medicine for its exact instructions and the sentence it came from.
- **A Stop list first**, because medicines the hospital stopped are the easiest to keep taking by mistake.
- **Ask your pharmacist**: every duplicate (Tylenol and acetaminophen, checked against NIH RxNorm), every sheet-vs-bottle mismatch, every smudged or conflicting dose, each with the exact words from the papers.
- **A bilingual fridge sheet** in Punjabi, Hindi or Spanish, with tick boxes for each dose of the week, warning signs and phone numbers, and a third page of questions for the pharmacy counter.
- **Phone reminders**, a WhatsApp summary for siblings, read-aloud with the phone's own voice, and plain-language drug information from MedlinePlus.

## How we built it

Next.js on Vercel, with Claude (`claude-sonnet-5-5`) through the Anthropic SDK's structured outputs, so every answer arrives in a fixed shape with a verbatim source quote for each medicine.

The core idea is **Claude reads, code verifies**. After Claude extracts the plan, plain TypeScript checks every medicine: the quoted sentence has to exist in the transcript, and the dose digits have to sit next to the medicine's name. Anything that fails gets one retry with the exact failures fed back; anything that still fails is kept off the schedule and becomes a pharmacist question; items the papers leave unclear stay visible with a "Confirm first" badge and get no phone reminders. Each medicine is then resolved to its active ingredient through the NIH RxNav API to catch the same drug under two names.

Translation only touches words. Every number on the fridge sheet is printed by code from structured fields, and a translation that introduces a new number (in any script: Gurmukhi ੫, Devanagari ५, Arabic-Indic ٥) is rejected and English is shown instead.

We measured it with an eval suite of fictional discharge sheets with known answers, including phone photos, a smudged dose, a blood thinner listed twice, a sheet-vs-bottle mismatch, and a hidden prompt injection. Result: 7 of 7 test cases fully correct, 0 invented medicines, median 7 seconds per sheet.

## Challenges we ran into

- **Strict vs. useful checking.** Our first verifier was so strict that every run needed a retry: hospital sheets write "Atorvastatin - dose increased. Now take 40 mg", and bottle labels put the brand and strength on separate lines. We loosened it carefully (dose digits must sit on the line naming the medicine, or the next one) and added tests proving an invented dose is still rejected.
- **Drug databases are messy.** Our first RxNorm query asked for combination products and flooded the screen with ninety "duplicates" (every drug ever combined with acetaminophen). Asking only for ingredients fixed it, and we wrote tests so it can't come back.
- **Fitting a fridge.** Getting STOP, the times of day, durations and tick boxes into two scripts on three letter pages took several rounds of print-to-PDF checks, and we pinned the print sizing so a later screen change cannot push it to a fourth page.
- **Too much on one screen.** Our first results page was a long scroll and a cluttered 7-day grid. We rebuilt it as four tabs with a tap-to-open medicine sheet and a text-size control, after checking every screen at phone, tablet and laptop width.
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
