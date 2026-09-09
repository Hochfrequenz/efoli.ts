import { describe, expect, it } from "vitest";

import {
  type CalendarDate,
  EdifactFormatVersion,
  FORMAT_VERSION_THRESHOLDS,
  getCurrentEdifactFormatVersion,
  getEdifactFormatVersion,
  getEdifactFormatVersionLabel,
  getEdifactFormatVersionValidFrom,
} from "../../src/edifact_format_version";

/** Declaration order of the enum, which the module relies on to be chronological. */
const ALL_VERSIONS = Object.values(EdifactFormatVersion);

/** The calendar day before the given one. Pure calendar arithmetic - no timezone involved. */
function previousDay(date: CalendarDate): CalendarDate {
  const asUtc = new Date(Date.UTC(date.year, date.month - 1, date.day - 1));
  return { year: asUtc.getUTCFullYear(), month: asUtc.getUTCMonth() + 1, day: asUtc.getUTCDate() };
}

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
    [new Date("2027-03-31T21:59:59Z"), EdifactFormatVersion.FV2610, "one second before FV2704"],
    [new Date("2027-03-31T22:00:00Z"), EdifactFormatVersion.FV2704, "exact FV2704 threshold"],
    // The two rows below restate the requirement ("FV2704 starts on 2027-04-01") in local calendar
    // terms, so that a reader need not redo the MESZ arithmetic. Neither adds mutation coverage
    // over the two UTC rows above: { 2027, 4, 1 } is localized to exactly the 22:00Z threshold,
    // and { 2027, 3, 31 } to a full day below it, well inside the range the 21:59:59Z row already
    // pins. While every threshold sits at Berlin midnight, no date-only row can be load-bearing.
    [{ year: 2027, month: 3, day: 31 }, EdifactFormatVersion.FV2610, "last day of FV2610 (date)"],
    [{ year: 2027, month: 4, day: 1 }, EdifactFormatVersion.FV2704, "first day of FV2704 (date)"],
  ])("returns %s for %s (%s)", (keyDate, expected) => {
    expect(getEdifactFormatVersion(keyDate)).toBe(expected);
  });

  it("saturates to the newest format version beyond the last known threshold", () => {
    // Deliberately expressed via the last enum member instead of a literal: a literal here would
    // keep passing while getEdifactFormatVersion returns a *stale* hardcoded version, which is the
    // regression this module's derived LATEST_FORMAT_VERSION exists to prevent.
    // What this cannot catch is a hardcoded literal that happens to be correct today - it only
    // fails once the next format version is added. Unlike python, TypeScript has no equivalent of
    // patching the module-level constant, so "thresholds bound every format version except the
    // newest" below covers the enum/threshold relationship from the other side instead.
    const newest = ALL_VERSIONS.at(-1);
    expect(getEdifactFormatVersion(new Date("2050-10-01T00:00:00Z"))).toBe(newest);
    expect(getEdifactFormatVersion({ year: 2050, month: 10, day: 1 })).toBe(newest);
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
    [EdifactFormatVersion.FV2704, { year: 2027, month: 4, day: 1 }],
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

describe("getEdifactFormatVersionLabel", () => {
  it.each([
    [EdifactFormatVersion.FV2104, "April 2021"],
    [EdifactFormatVersion.FV2110, "Oktober 2021"],
    [EdifactFormatVersion.FV2210, "Oktober 2022"],
    [EdifactFormatVersion.FV2304, "April 2023"],
    [EdifactFormatVersion.FV2310, "Oktober 2023"],
    [EdifactFormatVersion.FV2404, "April 2024"],
    [EdifactFormatVersion.FV2410, "Oktober 2024"],
    [EdifactFormatVersion.FV2504, "Juni 2025"],
    [EdifactFormatVersion.FV2510, "Oktober 2025"],
    [EdifactFormatVersion.FV2604, "April 2026"],
    [EdifactFormatVersion.FV2610, "Oktober 2026"],
    [EdifactFormatVersion.FV2704, "April 2027"],
  ])("returns correct label for %s", (version, expected) => {
    expect(getEdifactFormatVersionLabel(version)).toBe(expected);
  });
});

describe("EdifactFormatVersion", () => {
  it("has string value equal to its name", () => {
    expect(EdifactFormatVersion.FV2504).toBe("FV2504");
  });
});

describe("enum and threshold invariants", () => {
  it("declares every format version except the first with a known start date", () => {
    // Fails if a version is added to the enum but not given a threshold.
    for (const version of ALL_VERSIONS.slice(1)) {
      expect(() => getEdifactFormatVersionValidFrom(version)).not.toThrow();
    }
    expect(() => getEdifactFormatVersionValidFrom(ALL_VERSIONS[0]!)).toThrow(Error);
  });

  it("declares the format versions in chronological order", () => {
    // Both the derived newest version and the derived start dates rely on the declaration order.
    const startDates = ALL_VERSIONS.slice(1)
      .map((version) => {
        try {
          const { year, month, day } = getEdifactFormatVersionValidFrom(version);
          return year * 10000 + month * 100 + day;
        } catch {
          // A missing start date is reported by the test above; swallowing it here keeps this
          // test's failure about the *order*, as its name promises.
          return undefined;
        }
      })
      .filter((date): date is number => date !== undefined);
    expect(startDates).toEqual([...startDates].sort((a, b) => a - b));
    expect(new Set(startDates).size).toBe(startDates.length);
  });

  it("thresholds bound every format version except the newest", () => {
    // The invariant that lets LATEST_FORMAT_VERSION simply be the last enum member. Fails if a
    // format version is added to the enum without giving its predecessor a threshold, or if a
    // threshold is added for the newest version without adding its successor to the enum.
    const boundedVersions = new Set(FORMAT_VERSION_THRESHOLDS.map(([, version]) => version));
    const newest = ALL_VERSIONS.at(-1);
    expect(boundedVersions.has(newest!)).toBe(false);
    expect([...boundedVersions].sort()).toEqual(ALL_VERSIONS.filter((v) => v !== newest).sort());
  });

  it("orders the thresholds chronologically and uniquely", () => {
    // getEdifactFormatVersion returns the first threshold the key date falls below, which is only
    // the *closest* one if the list is ordered. The list is sorted at its point of definition;
    // this fails if that sorting is removed and an entry is written out of order.
    const instants = FORMAT_VERSION_THRESHOLDS.map(([threshold]) => threshold.getTime());
    expect(instants).toEqual([...instants].sort((a, b) => a - b));
    expect(new Set(instants).size).toBe(instants.length);
  });

  it("resolves each version's start date, and the day before it, to the expected version", () => {
    // Ties the thresholds to the start dates via the public API only: an out-of-order or
    // wrongly-offset threshold makes one of these two lookups return a neighbouring version.
    ALL_VERSIONS.slice(1).forEach((version, index) => {
      const validFrom = getEdifactFormatVersionValidFrom(version);
      expect(getEdifactFormatVersion(validFrom)).toBe(version);
      expect(getEdifactFormatVersion(previousDay(validFrom))).toBe(ALL_VERSIONS[index]);
    });
  });

  it("labels every format version as a month and a year", () => {
    // Presence is already a compile error (FORMAT_VERSION_LABELS is a Record over the enum), so
    // this is a *shape* guard: it catches a new label that is malformed, not one that is missing.
    // It cannot catch a wrong month - the explicit rows above do that.
    for (const version of ALL_VERSIONS) {
      expect(getEdifactFormatVersionLabel(version)).toMatch(/^\S+ \d{4}$/);
    }
  });
});

describe("rejecting key dates that cannot denote a real instant", () => {
  it("throws for an Invalid Date instead of saturating to the newest version", () => {
    // The regression this guards: an Invalid Date's time is NaN, every `<` against NaN is false,
    // so the threshold loop used to fall through and return the newest format version - borrowing
    // the saturation answer, which is supposed to mean "beyond what this release knows".
    expect(() => getEdifactFormatVersion(new Date("nonsense"))).toThrow(/Invalid Date/);
    expect(() => getEdifactFormatVersion(new Date(NaN))).toThrow(/Invalid Date/);
  });

  it.each([
    [{ year: 2027, month: 13, day: 1 }, "month 13 would normalize to January of the next year"],
    [{ year: 2027, month: 4, day: 31 }, "April 31st would normalize to May 1st"],
    [{ year: 2027, month: 0, day: 1 }, "month 0 would normalize to December of the previous year"],
    [{ year: 2027, month: 4, day: 0 }, "day 0 would normalize to the last day of March"],
    [{ year: 2027, month: 2, day: 29 }, "2027 is not a leap year"],
  ])("throws for a CalendarDate that is not a real date (%s)", (keyDate) => {
    expect(() => getEdifactFormatVersion(keyDate)).toThrow(/is not a real date/);
  });

  it.each([
    [{ year: 2027, month: 4, day: NaN }, "day"],
    [{ year: 2027, month: 4, day: 1.5 }, "day"],
    [{ year: 2027, month: 4.5, day: 1 }, "month"],
    [{ year: NaN, month: 4, day: 1 }, "year"],
  ])("throws for a non-integer CalendarDate component (%s)", (keyDate, field) => {
    expect(() => getEdifactFormatVersion(keyDate)).toThrow(
      new RegExp(`${field} must be an integer`)
    );
  });

  it("still accepts a real leap day", () => {
    expect(getEdifactFormatVersion({ year: 2028, month: 2, day: 29 })).toBe(
      EdifactFormatVersion.FV2704
    );
  });

  it("treats a two-digit year literally rather than as 19xx", () => {
    // Date.UTC(50, ...) means 1950; utcInstant means the year 50. Both land before every
    // threshold, so this cannot distinguish them today - it pins that such a year resolves at all
    // (rather than throwing) and documents the intent for whoever changes utcInstant later.
    expect(getEdifactFormatVersion({ year: 50, month: 4, day: 1 })).toBe(
      EdifactFormatVersion.FV2104
    );
  });
});

describe("getEdifactFormatVersionLabel for an unknown value", () => {
  it("throws instead of returning undefined", () => {
    // The record lookup used to hand back undefined despite the declared string return type,
    // which reaches a frontend as the literal text "undefined".
    expect(() => getEdifactFormatVersionLabel("FV9999" as EdifactFormatVersion)).toThrow(
      /No label is known/
    );
  });
});
