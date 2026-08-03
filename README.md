# Ba Zi App

A web app that calculates your Ba Zi (Four Pillars of Destiny) chart from your birth date, time, and location — and interprets it as a practical read on your elemental balance and life periods.

Built as a graduation project, developed with Claude Code.

## Status

- **Phase 1 (in progress):** birth-detail input form and Four Pillars chart calculation, verified against known-correct references.
- Planned: accounts and saved charts, summarized interpretation, Luck Pillars timeline.

## Tech

- Vite + React + TypeScript
- [lunar-javascript](https://github.com/6tail/lunar-javascript) for Chinese calendar / solar term data
- [Luxon](https://moment.github.io/luxon/) with the IANA time zone database for historically-correct timezone and DST handling
