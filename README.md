# Ba Zi App

A web app that calculates your Ba Zi (Four Pillars of Destiny) chart from your birth date, time, and location — and interprets it as a practical read on your elemental balance and life periods.

**Live at: https://ba-zi-app.vercel.app**

Built as a graduation project, developed with Claude Code. Deployed on Vercel (auto-deploys from this repository's main branch) with Supabase for accounts and saved charts.

## Status

- **Phase 1 (done):** birth-detail input form and Four Pillars chart calculation, verified against known-correct references.
- **Phase 2 (done):** accounts (Supabase auth) and per-user saved charts, protected by row level security. Verified end-to-end: sign up → save → log out → log back in → reopen, plus cross-user isolation.
- **Phase 3 (done):** summarized interpretation — five-element balance bars, day master read with a season-and-count strength lean, and prominent callouts for missing or heavily dominant elements. Fully rule-based and deterministic: every sentence is assembled from the verified chart data, no model calls.
- **Phase 4 (done):** Luck Pillars — the ten-year cycle timeline (direction from birth gender + year-stem polarity, starting age from the solar-term distance at 3 days = 1 year), each period framed as a resource level relative to the day master, with the gui ren (天乙贵人) helpful-people signal marked per period. Verified against the Wikibooks worked example and cross-checked rule sources before shipping.
- **Phase 5 (done):** the detailed interpretation tier behind a demonstration paywall — hidden stems (藏干) per branch with a recalculated full balance and the day-master strength shown step by step, Ten Gods (十神) for every stem and branch main-qi, a deliberately hedged useful-god note, and an in-depth breakdown of the current luck decade. The hidden-stem table and the Ten Gods derivation are both cross-verified against the calculation library and published references (all 100 stem pairs tested). The paywall shows the locked/blurred treatment with the standard unlock copy; during the test stage the upgrade button unlocks instantly for the signed-in account (flag stored per account) — no real payment processing.
- **Phase 6 (first pass, done):** this year's annual pillar (流年) in the paid tier — calculated by the same Lìchūn-exact year mechanism as the birth chart, checked for clash (冲) only against the four birth branches and the current luck pillar (the six opposite-branch pairs, cross-verified against the calculation library). Clash reads as significant movement and an important year, never a warning. Combination, harm, and punishment deliberately not attempted in this pass.
- **Test-stage access gate:** a light shared-passphrase screen (passphrase configured via environment variable, not stored in this repository) keeps the demo to the intended audience during the feedback stage.
- Landing page with hero, benefit cards, and coming-soon notes is live; the app is deployed and auto-deploys from this branch.

## Calculation conventions

- Clock time is corrected to **standard time**: historical daylight saving offsets (IANA time zone database, via Luxon) are removed before the day and hour pillars are read. No true-solar-time adjustment.
- Year and month pillars change at **solar term instants** (year at 立春); the birth moment is compared against the term instant in absolute time, not by calendar date.
- Unknown birth time produces a **three-pillar chart** with the hour pillar explicitly marked unknown — never a silently guessed time.
- Day boundary at midnight (standard time); 23:00–23:59 births fall in the 子 hour of the same day's pillar.

## Verification

The calculation is cross-checked in `src/lib/bazi/calculate.test.ts` (`npm test`) against independent references:

- **Day cycle:** every day from 1900–2050 (55,152 days) matches an independent Julian-day-number formula anchored to the documented fact that 1949-10-01 was a 甲子 day (`scripts/verify-day-pillar.mjs`).
- **Solar terms:** term dates for 1990 and 2026 match the Hong Kong Observatory's published calendar tables; 2026 equinox/solstice instants match Wikipedia's astronomical table to within a minute (`scripts/print-solar-terms.mjs`).
- **End-to-end:** reproduces Bruce Lee's publicly documented chart (庚辰 丁亥 甲戌 戊辰), plus edge cases for the 立春 year boundary across time zones, DST removal (both hemispheres, including a birth that shifts to the previous day), and unknown birth time.

## Tech

- Vite + React + TypeScript
- [lunar-javascript](https://github.com/6tail/lunar-javascript) for Chinese calendar / solar term data
- [Luxon](https://moment.github.io/luxon/) with the IANA time zone database for historically-correct timezone and DST handling
