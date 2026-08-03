# Ba Zi App

A web app that calculates your Ba Zi (Four Pillars of Destiny) chart from your birth date, time, and location — and interprets it as a practical read on your elemental balance and life periods.

Built as a graduation project, developed with Claude Code.

## Status

- **Phase 1 (done):** birth-detail input form and Four Pillars chart calculation, verified against known-correct references.
- **Phase 2 (done):** accounts (Supabase auth) and per-user saved charts, protected by row level security. Verified end-to-end: sign up → save → log out → log back in → reopen, plus cross-user isolation.
- Planned: summarized interpretation, Luck Pillars timeline.

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
