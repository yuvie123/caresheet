# HANDOFF: running the CareSheet demo without the builder at the table

For Zia and the team. Everything you need to demo CareSheet and answer judges.

Live app: https://caresheet.vercel.app · Finished example (no upload, no credit used): https://caresheet.vercel.app/?example · The messy-sheet example: https://caresheet.vercel.app/?example=messy

## Pre-demo checklist (Sunday ~9:45 AM, 30 minutes before judging)

1. **Open the live site on the laptop and on a phone** (phone on cellular, in case venue Wi-Fi is slow).
2. **Open `/?example` once on the demo laptop.** Both examples are pre-loaded in the page, so they keep working even if the connection drops afterwards.
3. **Do one real build:** click **Try: Heart patient + Tylenol bottle**, then **Build the plan**. It should finish in about 15 to 30 seconds. If it says "Live reading is paused", the API credit is used up: use the saved examples and the video (see "If something breaks").
4. **Check the credit** at console.anthropic.com (Plans and billing). Keep a few dollars available. Each sheet costs only a few cents.
5. **Print once** (Print for the fridge) to see the three-page output on paper. Bring one printed copy to the table.
6. **Open the demo video** in another tab: <!-- VIDEO_URL -->
7. **Charge everything**, sit near an outlet, and turn off notification pop-ups.

## The 2-minute demo

**0:00 Open with the person (15 s).**
"When an elderly parent comes home from hospital, an adult child usually ends up managing the pills from a few pages of clinical English, while the kitchen still has the old bottles. In families where the parent doesn't read English, that's where doses get doubled or medicines that were supposed to stop keep going."

**0:15 Show it working (60 s).**
- Click the heart sample (discharge sheet + Tylenol bottle). Click Build the plan. Point at the live steps: *reading, checking every line against the papers, looking up ingredients in RxNorm.*
- **The pill organizer**: "This is the week, laid out like the pill box on the counter." Tap a medicine: "Every medicine shows the exact sentence it came from."
- **Red Stop list**: "Amlodipine and aspirin were stopped in hospital. Medicines like that are easy to keep taking by mistake."
- **Ask your pharmacist**: "The Tylenol bottle and the acetaminophen on the sheet are the same drug, checked against NIH's drug database. CareSheet doesn't decide; it hands the pharmacist a quoted question."
- **Fridge sheet in Punjabi**, then Print or Send to WhatsApp.

**1:15 The safety story (30 s).**
Click **See the messy-sheet example** (instant, no waiting).
"This sheet has a smudged dose, a blood thinner listed twice, and a hidden line telling the AI to add aspirin. The aspirin never enters the plan. The doubtful medicines stay visible with a Confirm-first badge and a quoted question for the pharmacist, and they get no phone reminders. Numbers are never translated, only words, so a translation can't change a dose."

**1:45 Impact (15 s).**
"We test it on known cases: 7 of 7 fictional discharge cases correct with zero invented medicines. This is a single run on fictional sheets, so the next step is a planned two-week pilot with a hospital family-liaison program, measuring missed or doubled doses at the first follow-up visit."

## If something breaks

| Problem | Do this |
|---|---|
| Page won't load | Switch to phone data and reload. |
| "Live reading is paused right now" | The API credit ran out or the key was revoked. Click **See a finished example**; everything on screen is real output saved earlier. Then play the video. |
| "Build the plan" spins over 60 s or shows an error | Reload and try the sample once more. If it fails again, use the saved example and say so honestly: "this one is a saved real result." |
| Translation doesn't appear | Say "English is shown when a translation can't be verified, by design," and move on. |
| "Too many requests" | Wait a few minutes or switch to the other device. |
| Read-aloud says no voice for Punjabi | Normal on many laptops. It reads in English; say so. A phone with a Punjabi voice does better. |

## Questions judges may ask (answers you can give)

- **How is this different from asking ChatGPT?** Every dose on the sheet traces to a quoted line in the papers, and code checks that line and its numbers. For photos, the transcript is Claude's own reading, shown on screen so the family can check it. A chat answer gives you no way to check.
- **Is the data stored?** CareSheet saves nothing: no accounts, no database. Papers are sent to the Claude API to be read, and medicine names to NIH RxNav and MedlinePlus; standard hosting and API logs apply. It's a prototype and not HIPAA-ready; real use needs a business associate agreement and zero data retention.
- **Is it medical advice?** No. It reorganizes what the hospital wrote and flags inconsistencies for a pharmacist. Drug information comes from MedlinePlus, not from Claude.
- **Are the translations reviewed?** No. They're machine translations, labelled as such on the sheet, with English as the source. Numbers are never translated. Native-speaking pharmacist review is the next step.
- **What about handwriting, or a sheet already translated by the hospital?** Not tested yet. Our eval set is fictional typed and photographed sheets. Real handwriting is a known limit; anything unreadable goes to the pharmacist list.
- **What if the bottle belongs to a different person?** CareSheet can't tell. Check the name on every bottle against the papers; the sheet says to confirm with the pharmacist.
- **Drug interactions?** Out of scope on purpose. We only catch the same ingredient appearing twice (via NIH RxNorm), and a stopped medicine turning up in a bottle at home.
- **Why Claude?** It reads messy photos and PDFs and returns structured output we can verify; we use it where it's strong and check it with code where it's weak.
- **Meta fit (bringing people closer):** one caregiver puts siblings and the parent on one plan, in the parent's language, with a shared WhatsApp summary.
- **Cost per sheet?** A few cents at current Sonnet pricing (an estimate).
- **How will you measure impact?** Per sheet: mismatches and duplicates caught and whether the pharmacist confirmed them (the anonymous two-tap box). Per family: time to understand the plan on paper versus CareSheet. We have not run this yet.
- **Who did what?** <!-- TEAM ROLES -->
