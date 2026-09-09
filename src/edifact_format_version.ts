export enum EdifactFormatVersion {
  FV2104 = "FV2104", // valid from 2021-04-01 until 2021-10-01
  FV2110 = "FV2110", // valid from 2021-10-01 until 2022-04-01
  FV2210 = "FV2210", // valid from 2022-10-01 onwards ("MaKo 2022", was 2204 previously)
  FV2304 = "FV2304", // valid from 2023-04-01 onwards
  FV2310 = "FV2310", // valid from 2023-10-01 onwards
  FV2404 = "FV2404", // valid from 2024-04-01 onwards
  FV2410 = "FV2410", // valid from 2024-10-01 onwards
  FV2504 = "FV2504", // valid from 2025-06-06 onwards (was originally planned for 2025-04-04)
  FV2510 = "FV2510", // valid from 2025-10-01 onwards
  FV2604 = "FV2604", // valid from 2026-04-01 onwards
  FV2610 = "FV2610", // valid from 2026-10-01 onwards
  FV2704 = "FV2704", // valid from 2027-04-01 onwards
  // Whenever you add another value here, add the upper threshold of its *predecessor* to
  // FORMAT_VERSION_THRESHOLDS below - the new value is the one that intentionally has none.
  // The values have to stay in chronological order; the "declares the format versions in
  // chronological order" test guards that.
}

/** A calendar date without time, interpreted as midnight Europe/Berlin when comparing against thresholds. */
export type CalendarDate = { year: number; month: number; day: number };

/**
 * Reads a Date's time through Date.prototype, so that an instance overriding getTime or valueOf
 * cannot change what this module compares against the thresholds.
 */
function dateTime(value: Date): number {
  return Date.prototype.getTime.call(value);
}

/**
 * True only for a real Date, from any realm. Date.prototype.getTime throws unless the receiver
 * carries the internal [[DateValue]] slot, which is exactly the brand we need:
 * - `instanceof Date` is false for a Date built in another realm (a vm context, an iframe), which
 *   would send a perfectly valid Date down the CalendarDate path.
 * - The object tag is spoofable via Symbol.toStringTag, and a spoof that also defines a callable
 *   getTime would be treated as a Date. It has no [[DateValue]] slot, so `<` against a threshold
 *   falls back to valueOf and coerces both sides to strings: `{ getTime: () => 0 }` compared as
 *   1970 answered FV2704 instead of FV2104. That is the original saturation bug, reintroduced.
 */
function isDate(value: unknown): value is Date {
  try {
    Date.prototype.getTime.call(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds a UTC instant from calendar components. Deliberately not Date.UTC, which maps years
 * 0-99 to 1900-1999, so that a year like 50 would silently become 1950.
 */
function utcInstant(year: number, month: number, day: number, hour = 0): Date {
  const instant = new Date(0);
  instant.setUTCFullYear(year, month - 1, day);
  instant.setUTCHours(hour, 0, 0, 0);
  return instant;
}

/**
 * Rejects a CalendarDate that does not denote a real date, so that malformed input cannot be
 * silently normalized into a neighbouring month: month 13 would otherwise become January of the
 * next year, and April 31st would become May 1st, each yielding a confident wrong format version.
 * Unlike python's datetime.date, a CalendarDate is a plain object, so nothing but this check
 * stands between a JSON.parse result and a wrong answer.
 */
function assertRealCalendarDate(date: CalendarDate): CalendarDate {
  if (date === null || typeof date !== "object") {
    throw new Error(`Invalid key date: expected a Date or a CalendarDate, got ${String(date)}`);
  }
  // Destructured once and validated as locals, then returned for the caller to use. Reading the
  // properties again after validating them would let a getter-backed object (a Proxy, a reactive
  // wrapper, a class computing day from mutable state) return one value to the check and another
  // to the computation, so a validated date could still be turned into a different one.
  const { year, month, day } = date;
  for (const [name, value] of [
    ["year", year],
    ["month", month],
    ["day", day],
  ] as const) {
    if (!Number.isInteger(value)) {
      throw new Error(`Invalid CalendarDate: ${name} must be an integer, got ${String(value)}`);
    }
  }
  // datetime.date in the python twin spans years 1-9999 (MINYEAR/MAXYEAR) and cannot hold
  // anything outside, so reject the same range. Note this brings the two close but not level: the
  // twin additionally raises OverflowError for 0001-01-01, because localizing it to Berlin shifts
  // it below datetime's minimum. Without the bound, { year: 100000 } resolved to the newest format
  // version - the saturation answer again standing in for "your input was nonsense". It also keeps
  // every instant this function builds inside Date's range, including the hour-12 reference below.
  if (year < 1 || year > 9999) {
    throw new Error(`Invalid CalendarDate: year must be between 1 and 9999, got ${year}`);
  }
  const roundTripped = utcInstant(year, month, day);
  if (
    roundTripped.getUTCFullYear() !== year ||
    roundTripped.getUTCMonth() + 1 !== month ||
    roundTripped.getUTCDate() !== day
  ) {
    throw new Error(`Invalid CalendarDate: ${year}-${month}-${day} is not a real date`);
  }
  return { year, month, day };
}

/**
 * Converts a calendar date to the UTC timestamp of midnight Europe/Berlin on that date.
 * Uses Intl.DateTimeFormat to handle DST transitions correctly (no external deps required).
 */
function calendarDateToBerlinMidnight(date: CalendarDate): Date {
  const { year, month, day } = assertRealCalendarDate(date);
  // Use noon UTC as reference to determine the Berlin UTC offset on that date (avoids DST boundary issues)
  const referenceUtc = utcInstant(year, month, day, 12);
  const berlinHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Berlin",
      hourCycle: "h23",
      hour: "numeric",
    }).format(referenceUtc),
    10
  );
  // At 12:00 UTC, Berlin shows 13 (CET/+1) or 14 (CEST/+2) — offset is berlinHour - 12
  const offsetHours = berlinHour - 12;
  return new Date(utcInstant(year, month, day).getTime() - offsetHours * 3_600_000);
}

/** Converts a UTC Date to the calendar date in Europe/Berlin timezone. */
function utcToBerlinCalendarDate(utcDate: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(utcDate);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error(`Failed to parse Berlin date for ${utcDate.toISOString()}`);
  }
  return { year: parseInt(year, 10), month: parseInt(month, 10), day: parseInt(day, 10) };
}

// The newest format version: the last enum member, i.e. the only one without an upper threshold in
// FORMAT_VERSION_THRESHOLDS, because nobody knows yet when it will be superseded. Derived from the
// enum instead of hardcoded, so that adding a format version stays a single edit: a hardcoded value
// silently makes getEdifactFormatVersion return the *previous* version for every date beyond the
// last threshold. String enums emit forward mappings only, so Object.values preserves declaration
// order. The test "thresholds bound every format version except the newest" pins the relationship
// between the enum and the thresholds list.
const ALL_FORMAT_VERSIONS = Object.values(EdifactFormatVersion);
const LATEST_FORMAT_VERSION = ALL_FORMAT_VERSIONS.at(-1)!;

/** [exclusive upper threshold UTC, version valid below that threshold] */
type FormatVersionThreshold = [Date, EdifactFormatVersion];

// The thresholds as written: one per format version except the newest, which has no upper bound yet.
const THRESHOLDS_AS_WRITTEN: FormatVersionThreshold[] = [
  [new Date("2021-09-30T22:00:00Z"), EdifactFormatVersion.FV2104],
  [new Date("2022-09-30T22:00:00Z"), EdifactFormatVersion.FV2110],
  [new Date("2023-03-31T22:00:00Z"), EdifactFormatVersion.FV2210],
  [new Date("2023-09-30T22:00:00Z"), EdifactFormatVersion.FV2304],
  [new Date("2024-04-02T22:00:00Z"), EdifactFormatVersion.FV2310],
  [new Date("2024-09-30T22:00:00Z"), EdifactFormatVersion.FV2404],
  [new Date("2025-06-05T22:00:00Z"), EdifactFormatVersion.FV2410],
  [new Date("2025-09-30T22:00:00Z"), EdifactFormatVersion.FV2504],
  [new Date("2026-03-31T22:00:00Z"), EdifactFormatVersion.FV2510],
  [new Date("2026-09-30T22:00:00Z"), EdifactFormatVersion.FV2604],
  // 2027-04-01T00:00+02:00 (MESZ; German DST starts 2027-03-28) === 2027-03-31T22:00Z
  [new Date("2027-03-31T22:00:00Z"), EdifactFormatVersion.FV2610],
];

// Sorted once, here, so that every reader can rely on chronological order: getEdifactFormatVersion
// returns the first threshold the key date falls below, which is only the *closest* one if the list
// is ordered. Sorting at the single point of definition means a new entry written in the wrong place
// cannot produce wrong format versions.
// Exported for the tests only, deliberately not re-exported from index.ts: the invariants that tie
// this list to the enum cannot be checked through the public API alone.
export const FORMAT_VERSION_THRESHOLDS: FormatVersionThreshold[] = [...THRESHOLDS_AS_WRITTEN].sort(
  (a, b) => a[0].getTime() - b[0].getTime()
);

// The same thresholds as numbers, so the lookup compares primitives and never relies on `<`
// coercing a Date through valueOf.
const THRESHOLD_TIMES: [number, EdifactFormatVersion][] = FORMAT_VERSION_THRESHOLDS.map(
  ([threshold, version]) => [threshold.getTime(), version]
);

// Derives the inclusive Berlin start date for each version from the thresholds list, which is
// sorted at its point of definition, so no local sorting here.
// threshold[i] is the exclusive upper bound of version[i], so version[i+1] starts there.
// The latest version (the fallback) starts at the last threshold.
const VALID_FROM_MAP: Map<EdifactFormatVersion, CalendarDate> = (() => {
  const map = new Map<EdifactFormatVersion, CalendarDate>();
  for (let i = 0; i + 1 < FORMAT_VERSION_THRESHOLDS.length; i++) {
    const current = FORMAT_VERSION_THRESHOLDS[i];
    const next = FORMAT_VERSION_THRESHOLDS[i + 1];
    if (current && next) {
      map.set(next[1], utcToBerlinCalendarDate(current[0]));
    }
  }
  const last = FORMAT_VERSION_THRESHOLDS[FORMAT_VERSION_THRESHOLDS.length - 1];
  if (last) {
    map.set(LATEST_FORMAT_VERSION, utcToBerlinCalendarDate(last[0]));
  }
  return map;
})();

const FORMAT_VERSION_LABELS: Record<EdifactFormatVersion, string> = {
  [EdifactFormatVersion.FV2104]: "April 2021",
  [EdifactFormatVersion.FV2110]: "Oktober 2021",
  [EdifactFormatVersion.FV2210]: "Oktober 2022",
  [EdifactFormatVersion.FV2304]: "April 2023",
  [EdifactFormatVersion.FV2310]: "Oktober 2023",
  [EdifactFormatVersion.FV2404]: "April 2024",
  [EdifactFormatVersion.FV2410]: "Oktober 2024",
  [EdifactFormatVersion.FV2504]: "Juni 2025",
  [EdifactFormatVersion.FV2510]: "Oktober 2025",
  [EdifactFormatVersion.FV2604]: "April 2026",
  [EdifactFormatVersion.FV2610]: "Oktober 2026",
  [EdifactFormatVersion.FV2704]: "April 2027",
};

/**
 * Returns a human-readable German label for the given format version, e.g. "Oktober 2025".
 * @throws if the value is not an EdifactFormatVersion member.
 * Throws for a value that is not an EdifactFormatVersion member: the record lookup would
 * otherwise hand back undefined despite the declared string return type, which reaches a
 * frontend as the text "undefined".
 */
export function getEdifactFormatVersionLabel(version: EdifactFormatVersion): string {
  // hasOwnProperty, not `=== undefined`: FORMAT_VERSION_LABELS is an object literal, so a lookup
  // of "toString" or "constructor" resolves an inherited Object.prototype member and is not
  // undefined - a JS caller would get `function toString() { [native code] }` rendered as a label.
  if (!Object.prototype.hasOwnProperty.call(FORMAT_VERSION_LABELS, version)) {
    throw new Error(`No label is known for '${String(version)}'`);
  }
  return FORMAT_VERSION_LABELS[version];
}

/**
 * Returns the EdifactFormatVersion applicable for the given key date.
 * Accepts a UTC Date (compared as-is) or a CalendarDate (treated as midnight Europe/Berlin).
 *
 * Note that any key date beyond the last known threshold returns the newest format version this
 * library knows about, because the date at which that version will be superseded is not known yet.
 * This means an outdated efoli release reports its own newest version for key dates that actually
 * belong to a format version released after it. Update efoli to resolve such dates correctly.
 * Note that this saturation applies only to dates that are themselves valid: an unrepresentable
 * key date throws instead of borrowing that answer.
 *
 * @throws if the key date is an Invalid Date, or a CalendarDate whose components are not integers,
 * whose year is outside 1-9999, or that does not denote a real date.
 */
export function getEdifactFormatVersion(keyDate: Date | CalendarDate): EdifactFormatVersion {
  // isDate works by catching a throw, so it is called once and the result reused: calling it
  // twice built two exceptions for every CalendarDate input.
  const keyDateIsDate = isDate(keyDate);
  if (keyDateIsDate && Number.isNaN(dateTime(keyDate))) {
    // An Invalid Date's time is NaN, and every `<` comparison against NaN is false, so without
    // this guard the loop below falls through and returns the newest format version. That borrows
    // the saturation answer, whose whole point is to mean "beyond what this release knows".
    throw new Error("Invalid Date: the key date is not a valid point in time");
  }
  // Compared as numbers rather than as Dates: `<` on objects goes through valueOf, which an
  // instance can override, and which silently coerces a non-Date to a string.
  const utcTime = keyDateIsDate
    ? dateTime(keyDate)
    : dateTime(calendarDateToBerlinMidnight(keyDate));
  for (const [thresholdTime, version] of THRESHOLD_TIMES) {
    if (utcTime < thresholdTime) {
      return version;
    }
  }
  return LATEST_FORMAT_VERSION;
}

/** Returns the EdifactFormatVersion valid as of right now. */
export function getCurrentEdifactFormatVersion(): EdifactFormatVersion {
  return getEdifactFormatVersion(new Date());
}

/**
 * Returns the calendar date (Europe/Berlin) from which the given format version is valid.
 * Throws for FV2104 since it is the earliest known version with no defined start date.
 */
export function getEdifactFormatVersionValidFrom(version: EdifactFormatVersion): CalendarDate {
  const date = VALID_FROM_MAP.get(version);
  if (date === undefined) {
    throw new Error(
      `Start date for ${String(version)} is not known. Known versions: ${[...VALID_FROM_MAP.keys()].join(", ")}`
    );
  }
  return date;
}
