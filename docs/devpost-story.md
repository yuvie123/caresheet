## Inspiration

Picture the evening a parent comes home from hospital. The discharge papers run to several pages of clinical English: two new medicines, one changed dose, two to stop. The kitchen cabinet still holds the old bottles, one under a brand name that hides the fact it is the same drug as something on the new list. The parent reads Punjabi, not English, so every instruction passes through a tired son or daughter who is also working out which pills go where, and when. (This is an illustrative scenario, not a specific family.)

That ordinary evening is where doses get doubled and stopped medicines keep being taken. About one in five medical patients has an adverse event in the first weeks after discharge, and about two thirds of those involve drugs. I built CareSheet for that evening.

## What it does

You paste the discharge text, or photograph the pages and the pill bottles. CareSheet turns them into one short screen with four tabs.

The **Daily routine** tab shows Morning, Midday, Evening and Bedtime for any of the seven days, and a medicine prescribed for five days drops off after day five. A red strip at the top names anything the hospital stopped, since stopped medicines are the easiest to keep taking by mistake. Tap a medicine to see its dose, its times and the exact sentence it came from.

The **All medicines** tab lists everything and filters by New, Dose changed, Keep taking, Stop and Unclear.

The **Ask the pharmacist** tab holds what CareSheet would not put on the schedule. That includes a Tylenol bottle and an acetaminophen line on the sheet (matched through the NIH RxNorm drug database), a sheet and a bottle that disagree, a smudged dose, and any line it cannot find in the papers. Each question quotes the papers.

The **Fridge sheet** tab prints three pages in English and Punjabi, Hindi or Spanish, with a tick box for every dose of the week. There are also phone reminders, a WhatsApp summary, read-aloud, drug information from MedlinePlus, and a text size control for low vision.

## How I built it

CareSheet is a Next.js app on Vercel. It calls Claude (claude-sonnet-5-5) through the Anthropic SDK with structured outputs, so every answer arrives in a fixed shape and every medicine carries a verbatim quote from the papers.

Claude reads and plain TypeScript checks. For each medicine, the quoted sentence has to exist in the transcript and the dose numbers have to sit next to the medicine's name. A failure gets one retry with the exact failures fed back. Anything that still fails stays off the schedule and goes to the pharmacist. Items the papers leave unclear stay visible with a "Confirm first" badge and get no phone reminders. Each medicine is then matched to its active ingredient through the NIH RxNav API, which is how the same drug under two names gets caught.

Translation changes words only. Code prints every number on the fridge sheet, and a translation that adds a number in any script (Gurmukhi, Devanagari or Arabic-Indic digits included) is thrown away and English is shown.

I tested it on seven fictional discharge sheets with known answers: phone photos, a smudged dose, a blood thinner listed twice, a sheet and bottle that disagree, and a hidden instruction to add aspirin. On the latest run all seven were right, with no invented medicines and a median of about 7 seconds per sheet. That is one run on fictional data.

## Challenges I ran into

- My first verifier was so strict that every run needed a retry. Hospital sheets write "Atorvastatin - dose increased. Now take 40 mg", and bottle labels put the brand and the strength on separate lines. I loosened it carefully and added tests showing that an invented dose is still rejected.
- Drug databases are messy. My first RxNorm query asked for combination products and returned ninety "duplicates" for acetaminophen. Asking only for ingredients fixed it, and a test keeps it fixed.
- Fitting a fridge sheet in two scripts onto three letter pages took several rounds of print-to-PDF checks. I pinned the print sizing so a later screen change cannot push it to a fourth page.
- My first results page was one long scroll with a crowded seven-day grid. I rebuilt it as four tabs with a tap-to-open medicine sheet, then checked every screen at phone, tablet and laptop width.

## Accomplishments that I'm proud of

- Zero invented medicines across the test sheets, including the one with a hidden instruction to add aspirin, which never reaches the schedule.
- A fridge sheet a grandparent can read, with numbers that a translation cannot change.
- Nothing is stored. There are no accounts and no database. Papers go to the Claude API to be read, and medicine names go to NIH RxNav and MedlinePlus.

## What I learned

The most useful thing Claude did here was turn a messy page into structured data that ordinary code could check. Deciding where the model may be wrong, and what happens when it is, took more of my time than writing the prompt.

## What's next

A two-week pilot with a hospital family-liaison program or a gurdwara seniors' group, counting missed or doubled doses at the first follow-up visit. After that: a pharmacist review mode, import from patient portals, and translations reviewed by native-speaking pharmacists. CareSheet has not been tested on real handwriting, on papers that are not in English, or with real families, and its translations are machine-made until a pharmacist reviews them.
