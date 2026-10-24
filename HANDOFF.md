# HANDOFF: running the CareSheet demo on Sunday

For Zia and the team. Yuvraj flies out Sunday 7 AM, so this is everything you need to demo alone.

## Before judging (Sunday 10:00 AM)

1. Open the live site on your laptop **and** your phone: https://caresheet.vercel.app
2. Click **Try: Heart patient + Tylenol bottle**, then **Build the plan**. It should finish in under a minute.
3. Keep the Devpost demo video open in another tab as a backup: <!-- VIDEO_URL -->
4. Charge everything. Sit near the outlet if you can.

## The 2-minute demo

**0:00 Open with the person (15 s).**
"When an elderly parent comes home from hospital, an adult child usually ends up managing the pills from a few pages of clinical English, while the kitchen still has the old bottles. In families where the parent doesn't read English, that's where doses get doubled or medicines that were supposed to stop keep going."

**0:15 Show it working (60 s).**
- Click the heart sample (discharge sheet + Tylenol bottle). Click Build the plan. Point at the live steps: *reading, checking every line against the papers, looking up ingredients in RxNorm.*
- **The pill organizer**: "This is the week, laid out like the pill box on the counter."
- **Red Stop list**: "Amlodipine and aspirin were stopped in hospital. Missing a stop is one of the most common mistakes after discharge."
- **Ask your pharmacist**: "The Tylenol bottle and the acetaminophen on the sheet are the same drug, checked against NIH's drug database. CareSheet doesn't decide; it hands the pharmacist a quoted question."
- Tap a medicine in the organizer: "Every line shows the exact sentence it came from."
- **Fridge sheet in Punjabi**, then Print or Send to WhatsApp.

**1:15 The safety story (30 s).**
Click **Try: Messy sheet with problems** (optional if time allows, it takes ~40 s).
"This sheet has a smudged dose, a blood thinner listed twice, and a hidden line telling the AI to add aspirin. None of those reach the schedule. Claude reads, plain code verifies, and anything uncertain goes to the pharmacist. Numbers are never translated, only words, so a translation can't change a dose."

**1:45 Impact (15 s).**
"We measure it with an eval suite: <!-- EVAL_HEADLINE -->. Next is a two-week pilot with a hospital family-liaison program, measuring missed or doubled doses at the first follow-up visit."

## If something breaks

| Problem | Do this |
|---|---|
| Page won't load | Switch to phone data and reload. |
| "Build the plan" spins over 90 s or shows an error | Reload and try the sample once more. If it fails again, play the demo video. |
| Translation doesn't appear | Say "English is shown when a translation can't be verified, by design," and move on. |
| "Too many requests" | Wait 2 minutes or switch to the other laptop/phone. |

## Questions judges may ask

See the "Likely judge questions" section at the bottom of NOTES.md. Short versions:
- **How is this different from asking ChatGPT?** A chat answer can quietly invent a dose. CareSheet structurally can't put an unverified dose on the fridge: code checks every line against the papers.
- **Is the data stored?** No. Nothing is saved; documents go to the Claude API to be read and aren't logged.
- **Is it medical advice?** No. It reorganizes what the hospital wrote and flags inconsistencies for a pharmacist.
- **Why Claude?** It reads messy photos and PDFs well and returns structured output we can verify; we use it where it's strong and check it with code where it's weak.
- **Who did what?** <!-- TEAM ROLES -->
