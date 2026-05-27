import { describe, expect, it } from "vitest";

import {
  EdifactFormatVersion,
  getCurrentEdifactFormatVersion,
  getEdifactFormatVersion,
  getEdifactFormatVersionValidFrom,
} from "../../src/edifact_format_version";

describe("getEdifactFormatVersion", () => {
  it.each([
    [new Date("2021-01-01T00:00:00Z"), EdifactFormatVersion.FV2104, "before FV2110 (datetime)"],
    [{ year: 2021, month: 1, day: 1 }, EdifactFormatVersion.FV2104, "before FV2110 (date)"],
    [new Date("2021-05-01T00:00:00Z"), EdifactFormatVersion.FV2104, "mid FV2104"],
    [new Date("2021-10-01T00:00:00Z"), EdifactFormatVersion.FV2110, "start of FV2110"],
    [new Date("2022-07-01T00:00:00Z"), EdifactFormatVersion.FV2110, "mid FV2110"],
    [new Date("2022-10-01T00:00:00Z"), EdifactFormatVersion.FV2210, "start of FV2210"],
    [new Date("2023-12-01T00:00:00Z"), EdifactFormatVersion.FV2310, "mid FV2310"],
    [new Date("2024-01-01T00:00:00Z"), EdifactFormatVersion.FV2310, "start of 2024 still FV2310"],
    [
      new Date("2024-04-01T00:00:00Z"),
      EdifactFormatVersion.FV2310,
      "FV2404 valid from 2024-04-03 (not 04-01)",
    ],
    [new Date("2024-04-02T22:00:00Z"), EdifactFormatVersion.FV2404, "exact FV2404 threshold"],
    [new Date("2024-09-30T21:59:59Z"), EdifactFormatVersion.FV2404, "one second before FV2410"],
    [new Date("2024-09-30T22:00:00Z"), EdifactFormatVersion.FV2410, "exact FV2410 threshold"],
    [new Date("2025-03-31T22:00:00Z"), EdifactFormatVersion.FV2410, "mid FV2410"],
    [new Date("2025-04-03T22:00:00Z"), EdifactFormatVersion.FV2410, "still FV2410 before June"],
    [new Date("2025-06-05T22:00:00Z"), EdifactFormatVersion.FV2504, "exact FV2504 threshold"],
    [{ year: 2025, month: 4, day: 3 }, EdifactFormatVersion.FV2410, "date 2025-04-03 is FV2410"],
    [{ year: 2025, month: 4, day: 4 }, EdifactFormatVersion.FV2410, "date 2025-04-04 is FV2410"],
    [{ year: 2025, month: 6, day: 6 }, EdifactFormatVersion.FV2504, "date 2025-06-06 is FV2504"],
    [new Date("2025-09-30T22:00:00Z"), EdifactFormatVersion.FV2510, "exact FV2510 threshold"],
    [new Date("2025-10-01T22:00:00Z"), EdifactFormatVersion.FV2510, "mid FV2510"],
    [new Date("2026-03-31T21:59:59Z"), EdifactFormatVersion.FV2510, "one second before FV2604"],
    [new Date("2026-03-31T22:00:00Z"), EdifactFormatVersion.FV2604, "exact FV2604 threshold"],
    [new Date("2026-09-30T21:59:59Z"), EdifactFormatVersion.FV2604, "one second before FV2610"],
    [new Date("2026-09-30T22:00:00Z"), EdifactFormatVersion.FV2610, "exact FV2610 threshold"],
    [new Date("2050-10-01T00:00:00Z"), EdifactFormatVersion.FV2610, "far future falls to latest"],
  ])("returns %s for %s (%s)", (keyDate, expected) => {
    expect(getEdifactFormatVersion(keyDate)).toBe(expected);
  });
});

describe("getEdifactFormatVersionValidFrom", () => {
  it.each([
    [EdifactFormatVersion.FV2110, { year: 2021, month: 10, day: 1 }],
    [EdifactFormatVersion.FV2210, { year: 2022, month: 10, day: 1 }],
    [EdifactFormatVersion.FV2304, { year: 2023, month: 4, day: 1 }],
    [EdifactFormatVersion.FV2310, { year: 2023, month: 10, day: 1 }],
    [EdifactFormatVersion.FV2404, { year: 2024, month: 4, day: 3 }], // threshold 2024-04-02T22Z → Berlin 2024-04-03
    [EdifactFormatVersion.FV2410, { year: 2024, month: 10, day: 1 }],
    [EdifactFormatVersion.FV2504, { year: 2025, month: 6, day: 6 }], // threshold 2025-06-05T22Z → Berlin 2025-06-06
    [EdifactFormatVersion.FV2510, { year: 2025, month: 10, day: 1 }],
    [EdifactFormatVersion.FV2604, { year: 2026, month: 4, day: 1 }],
    [EdifactFormatVersion.FV2610, { year: 2026, month: 10, day: 1 }],
  ])("returns correct start date for %s", (version, expected) => {
    expect(getEdifactFormatVersionValidFrom(version)).toEqual(expected);
  });

  it("throws for FV2104 (earliest version, no defined start date)", () => {
    expect(() => getEdifactFormatVersionValidFrom(EdifactFormatVersion.FV2104)).toThrow(Error);
  });
});

describe("getCurrentEdifactFormatVersion", () => {
  it("returns a valid EdifactFormatVersion member", () => {
    const result = getCurrentEdifactFormatVersion();
    expect(Object.values(EdifactFormatVersion)).toContain(result);
  });
});

describe("EdifactFormatVersion", () => {
  it("has string value equal to its name", () => {
    expect(EdifactFormatVersion.FV2504).toBe("FV2504");
  });
});
