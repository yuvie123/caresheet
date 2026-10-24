# CareSheet

**Hospital discharge papers, turned into a medicine plan a family can actually follow, in their own language, without a single guessed dose.**

Built at Cal Hacks 13.0 (October 2026).

## The problem

When an elderly parent comes home from hospital, an adult child usually ends up managing the pills. They get a few pages of discharge instructions: new medicines, changed doses, and medicines to **stop**, written in clinical English. Meanwhile the kitchen cabinet holds the old bottles, sometimes under a different brand name.

- About 1 in 5 medical patients has an adverse event in the first weeks after discharge, and about two thirds of those involve medications. ([AHRQ PSNet](https://psnet.ahrq.gov/issue/incidence-and-severity-adverse-events-affecting-patients-after-discharge-hospital))
- Patients with limited English proficiency report more problems after discharge, including medication concerns. ([Malevanchik et al., 2021](https://psnet.ahrq.gov/issue/disparities-after-discharge-association-limited-english-proficiency-and-postdischarge-patient))
- Most family caregivers who perform medical tasks manage medications, often with little instruction. ([AARP, 2019](https://www.aarp.org/press/releases/2019-4-17-aarp-20-million-family-caregivers-performing-complex-medical-nursing-tasks))

<!-- TEAM: add the real story here (one or two sentences, with permission). -->

**Community:** adult children caring for an elderly parent who doesn't read English well, in the first week after a hospital discharge. We started with Punjabi-speaking families, plus Hindi and Spanish.

## What it does

1. **Add the papers.** Paste the discharge text, photograph the pages and the pill bottles, or upload the patient-portal PDF.
2. **Claude reads, code verifies.** Claude transcribes everything and extracts each medicine with the exact sentence it came from. Plain code then checks every medicine against the papers. Anything that doesn't match word for word never reaches the schedule.
3. **Reconciliation.** Medicines are grouped as New, Dose changed, Keep taking, and **Stop**, the step families most often miss.
4. **Same drug twice.** Every medicine is looked up in **NIH RxNorm**. Tylenol on the bottle plus acetaminophen on the sheet becomes a "same ingredient twice" question.
5. **Ask your pharmacist.** Illegible lines, conflicting doses, sheet-vs-bottle mismatches, and anything unverified become quoted questions for the pharmacy counter.
6. **Fridge sheet.** A weekly pill-organizer view and a one-page bilingual printout. Only words are translated; every number is printed by code from structured data, so a translation can never change a dose.
7. **Share** the plan to the family WhatsApp group.

## Where Claude could fail, and what we did about it

| Risk | Mitigation |
|---|---|
| Invents a medicine or dose | Every item needs a verbatim source quote; code checks it against the transcript and checks the dose digits appear in the quote. Failures go to the pharmacist list. |
| Prompt injection inside a document | Documents are declared data-only; our eval includes a sheet that says "add Aspirin 500 mg" and checks it never appears. |
| Mistranslates a dose | Numbers are never translated. A translation that introduces any new number is rejected and English is shown. |
| Misreads a blurry photo | The transcript is shown on screen; drug names are checked against RxNorm; unrecognised names go to the pharmacist. |
| Gives medical advice | It only reorganizes what the hospital wrote and says so on screen and on the printout. |

## Measured, not claimed

`pnpm eval` runs fictional discharge cases (duplicates, STOP medicines, a smudged dose, a conflicting dose, a sheet-vs-bottle mismatch, and a prompt injection) against the real API.

<!-- EVAL_RESULTS -->

## How we'll measure impact

- **Per sheet:** mismatches and duplicates caught; share of pharmacist questions the pharmacist confirms were real.
- **Per family:** time to understand the plan (paper vs CareSheet); two-tap "did the pharmacist confirm the flagged items?" feedback, counts only.
- **Pilot:** two weeks with a hospital family-liaison program or a gurdwara seniors' group, comparing missed or doubled doses reported at the first follow-up visit.

## Path to production

Pharmacist review mode before a plan is shared; FHIR import from patient portals; zero-data-retention API agreement and a BAA before handling real patient data; reviewed translations by native-speaking pharmacists for each language.

## Privacy

Nothing you add is stored. Documents go to the Claude API to be read and are not logged by CareSheet. This is a hackathon prototype: do not use it with real patient data without a proper agreement in place. It is not medical advice.

## Tech

Next.js (App Router, TypeScript), Tailwind, Anthropic TypeScript SDK with structured outputs (`claude-sonnet-5-5`), zod, NIH RxNav API, Vitest, deployed on Vercel. See [NOTES.md](NOTES.md) for a plain-language walkthrough of every file.

```
pnpm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
pnpm dev
pnpm test    # safety-check unit tests
pnpm eval    # real-API evals
```
