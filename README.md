# E-Foli.ts

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node.js versions supported](https://img.shields.io/badge/node-%3E%3D18-green)
![npm version](https://img.shields.io/npm/v/@hochfrequenz/efoli)
![CI status badge](https://github.com/Hochfrequenz/efoli.ts/workflows/CI/badge.svg)

`@hochfrequenz/efoli` is a TypeScript package that contains

- an enum `EdifactFormat` that models EDIFACT formats used by German utilities, e.g.
  - `UTILMD`
  - `MSCONS`
  - `INVOIC`
  - …
- an enum `EdifactFormatVersion` that models validity periods of different message versions, e.g.
  - `FV2310` is valid from 2023-10-01 onwards
  - `FV2404` is valid from 2024-04-03 onwards
  - …
- helper functions that allow
  - deriving the `EdifactFormat` from a given _Prüfidentifikator_ (e.g. `55001` ➡ `UTILMDS`)
  - deriving the `EdifactFormatVersion` from a given date (e.g. `2024-01-01` ➡ `FV2310`)

It's not much, but we need it at many places.
This is why we use this package as a central place to define these formats and versions.

This is the TypeScript port of the Python package [efoli](https://github.com/Hochfrequenz/efoli).

## Installation

```bash
npm install @hochfrequenz/efoli
```

## Usage

```typescript
import {
  EdifactFormat,
  EdifactFormatVersion,
  getFormatOfPruefidentifikator,
  getEdifactFormatVersion,
  getCurrentEdifactFormatVersion,
} from "@hochfrequenz/efoli";

// Derive the EDIFACT format from a Prüfidentifikator
const format: EdifactFormat = getFormatOfPruefidentifikator("55001"); // EdifactFormat.UTILMDS

// Derive the format version for a specific date (UTC timestamp)
const version: EdifactFormatVersion = getEdifactFormatVersion(new Date("2024-01-01T00:00:00Z")); // EdifactFormatVersion.FV2310

// Or pass a plain calendar date (interpreted as midnight Europe/Berlin — preferred for date-only inputs)
const version2: EdifactFormatVersion = getEdifactFormatVersion({ year: 2025, month: 6, day: 6 }); // EdifactFormatVersion.FV2504

// Get the currently active format version
const current: EdifactFormatVersion = getCurrentEdifactFormatVersion();
```

### Validation

`getEdifactFormatVersion` throws instead of guessing when the key date cannot denote a real instant:

- an `Invalid Date`, e.g. `new Date("nonsense")` — this previously returned the _newest_ format version
- a `CalendarDate` whose components are not integers, whose year lies outside 1–9999, or that is not
  a real date (`{ month: 13 }`, April 31st, February 29th in a non-leap year) — these were previously
  normalized into a neighbouring month, again yielding a plausible-looking wrong version

`getEdifactFormatVersionLabel` and `getEdifactFormatVersionValidFrom` throw for a value that is not an
`EdifactFormatVersion` member.

The bounds match `datetime.date` in the [Python twin](https://github.com/Hochfrequenz/efoli.py), so
both packages accept exactly the same dates.

## Setup for Local Development

```bash
npm install
npm test          # run unit tests
npm run typecheck # type check
npm run lint      # lint
npm run build     # build CJS + ESM output to dist/
```

## Contribute

You are very welcome to contribute to this repository by opening a pull request against the main branch.
