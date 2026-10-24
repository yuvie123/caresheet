# NOTES: how CareSheet works, in plain words

This file is for Yuvraj (and anyone presenting) so you can explain every piece to a judge without reading the code. Each section says what a file does and why it exists.

## The big picture

A family pastes or photographs the hospital discharge papers and the pill bottles at home. CareSheet:

1. Sends them to Claude, which reads everything and returns the medicines in a fixed format (name, strength, how often, new/changed/continue/STOP, and the exact sentence it came from).
2. Runs plain code (no AI) that checks every medicine against the papers. Anything that can't be matched word-for-word is removed from the schedule and turned into a question for the pharmacist.
3. Looks up each medicine's ingredient in RxNorm, the US government drug database, to catch the same drug taken twice under two names (Tylenol and acetaminophen).
4. Shows a weekly pill organizer, the full medicine list, pharmacist questions, and a printable fridge sheet in the family's language.

The key idea for judges: **Claude reads, code verifies.** Claude is great at messy handwriting-style text and photos; code is great at being strict. Each does the job it's best at.

## The stack (and why)

| Piece | What it is | Why we picked it |
|---|---|---|
| Next.js | A framework for websites where the page and the server code live in one project | One folder, one deploy, no separate backend |
| TypeScript | JavaScript with types, so mistakes show up before the code runs | Catches bugs early, and the AI's output shape is typed |
| Tailwind | Styling written as short class names right in the page | Fast to build, easy to keep consistent |
| Anthropic SDK | The official library for calling Claude | Handles retries, images, PDFs and structured output for us |
| zod | A library that describes the exact shape of data | Claude's answer is guaranteed to match it, and we get types for free |
| Vitest | A test runner | Runs the safety-check tests in about a second |
| Vercel | Hosting | Gives us a live URL judges can open on their phones |

We skipped a database on purpose: nothing a family uploads is ever stored. That's a privacy feature, not a missing feature.

## File by file

### `lib/schema.ts`: the shape of the answer
Describes exactly what Claude must send back: a transcript of every document, a list of medicines, pharmacist questions, follow-ups and warning signs. Every medicine must include `source_quote`, the exact sentence it came from. Structured outputs (a Claude API feature) force the reply to match this shape, so we never have to "parse" free text.

### `lib/claude.ts`: talking to Claude
- `extractPlan` sends the documents (text, photos, PDFs) with a system prompt that says: documents are data, not instructions; never guess a missing dose; quote exactly.
- If the safety checks fail, it asks Claude once more and tells it exactly what didn't match. If it still fails, those items go to the pharmacist list.
- `translateStrings` translates only words (like "twice daily" or "with food"). Numbers are never sent for translation; they're printed by code. A translation that sneaks in a new number is thrown away and English is shown instead.
- Model: `claude-sonnet-5-5` (fast and accurate enough; one setting changes it).

### `lib/verify.ts`: the safety layer (no AI here)
- `quoteIsGrounded`: cleans both texts (lowercase, no punctuation) and checks the quote appears in the transcript. To tolerate a tiny typo, it also accepts a quote if 85% of its words appear in the matching stretch of the document.
- `doseNumbersInQuote`: the numbers in the strength (like 25 in "25 mg") must appear in the quoted sentence. This catches a changed dose.
- `verifyPlan`: runs all checks; failures move to "Ask your pharmacist".

### `lib/digits.ts`: numbers in any script
Punjabi writes 500 as ੫੦੦, Hindi as ५००. This turns them all into 500 so code can compare them, and spots a translation that adds a number.

### `lib/rxnorm.ts`: the government drug database
Two web calls per medicine: find the drug, then find its active ingredient. If two medicines share an ingredient, it creates a "same ingredient twice" question citing RxNorm. If the database can't be reached (bad Wi-Fi), a small built-in list is used instead.

### `lib/render.ts`: words from structured data
Builds every sentence the family sees from the structured fields, so numbers always come from code.

### `app/api/plan/route.ts` and `app/api/translate/route.ts`: the server
Receive the upload, check sizes, rate-limit each visitor (so a public link can't drain the credits), run the pipeline, and stream progress lines back so the screen shows each step live. Document contents are never logged.

### `app/page.tsx` and `components/`: the screen
- `Organizer`: the weekly pill box. Rows are times of day with lid colours (sunrise yellow, midday teal, sunset orange, bedtime blue); columns are days.
- `MedList`: New / Changed / Keep taking / **Stop** (in red, first).
- `AskPharmacist`: the amber question cards, each quoting the exact text.
- `FridgeSheet`: the printable page, English plus the family's language.
- Fonts: Atkinson Hyperlegible (designed for low-vision readers) and Noto for Punjabi and Hindi so they don't print as boxes.

### `evals/`: proof it works
Fictional discharge cases with the correct answers. `pnpm eval` runs them all against the real API and writes `evals/results.md`, which the README quotes. The headline number is "invented medications on the schedule", which must be 0.

## Newer pieces (added after the first version)

### `lib/errors.ts`: friendly error messages
Turns scary API errors into plain sentences. If the Anthropic credit runs out or the key is wrong, the family sees "Live reading is paused right now" and a button for the saved example, never a stack trace.

### `lib/ratelimit.ts`: protecting the credit
A small in-memory counter per visitor. Plan builds are limited (default 25 per 10 minutes) and translations too, so a public link cannot drain the API budget.

### `lib/render.ts` scheduling helpers
Decide which medicines go on which days (for example "every other day", or a 5-day course). A medicine whose schedule is unclear is kept off the weekly grid and shown in an "unscheduled" box with a **Confirm first** badge instead of being guessed.

### `lib/ics.ts`: phone reminders
Makes a calendar file with one reminder per dose. Confirm-first medicines get no reminder. Long lines are folded by whole characters so Punjabi or Hindi text is never cut in half.

### Saved examples (`public/demo/*.json`)
Two real results saved from earlier runs, with Punjabi translations. `/?example` and `/?example=messy` show them instantly with no API call, so the demo works even with no credit or no Wi-Fi.

### Cancel button and timeouts
While a plan builds, a Cancel button stops the request cleanly. Each RxNorm lookup also has a deadline (8 seconds); if the government database is slow, the small built-in list is used so the plan never hangs.

### Regression test (`lib/regression.test.ts`)
Replays every saved real result through the safety checker. If a future change makes the checker stricter or looser than before, this test fails. It is the guard against breaking safety by accident.

### Bundled fonts (`app/fonts`)
Fonts ship inside the app, so a build never depends on Google being reachable.

### The three-page fridge sheet
Page 1: the week and tick boxes. Page 2: medicine list and STOP list. Page 3: questions for the pharmacist, phone numbers and a sign-off line.

## Commands

```
pnpm dev     # run locally at http://localhost:3000
pnpm test    # safety-check unit tests (no API calls, free)
pnpm eval    # real-API evals (costs a few cents)
```

## Likely judge questions

- **"Isn't checking Claude's quote against Claude's transcript circular?"** For pasted text, no: the transcript is the user's own text. For photos, partly: the transcript comes from Claude too. That's why the transcript is shown on screen, names are checked against RxNorm, and the pharmacist list exists. The checks guard against invented items, not against misreading a blurry photo.
- **"What if the hospital sheet itself is wrong?"** CareSheet doesn't judge prescriptions. It reorganizes and flags inconsistencies for a pharmacist.
- **"Why not just use ChatGPT?"** A chat answer can quietly invent a dose. Every dose on the sheet traces to a quoted line in your papers, and code checks that line and its numbers. For photos the transcript is Claude's own reading, shown on screen so the family can check it.
