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
  // whenever you add another value here, also add its threshold to FORMAT_VERSION_THRESHOLDS below
}

/** A calendar date without time, interpreted as midnight Europe/Berlin when comparing against thresholds. */
export type CalendarDate = { year: number; month: number; day: number };

/**
 * Converts a calendar date to the UTC timestamp of midnight Europe/Berlin on that date.
 * Uses Intl.DateTimeFormat to handle DST transitions correctly (no external deps required).
 */
function calendarDateToBerlinMidnight(date: CalendarDate): Date {
  // Use noon UTC as reference to determine the Berlin UTC offset on that date (avoids DST boundary issues)
  const referenceUtc = new Date(Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0));
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
  return new Date(Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0) - offsetHours * 3_600_000);
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

// Each entry is [exclusive upper threshold UTC, version valid below that threshold].
const FORMAT_VERSION_THRESHOLDS: [Date, EdifactFormatVersion][] = [
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
];

// Derives the inclusive Berlin start date for each version from the thresholds list.
// threshold[i] is the exclusive upper bound of version[i], so version[i+1] starts there.
// FV2610 (the fallback) starts at the last threshold.
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
    map.set(EdifactFormatVersion.FV2610, utcToBerlinCalendarDate(last[0]));
  }
  return map;
})();

const FORMAT_VERSION_LABELS: Record<EdifactFormatVersion, string> = {
  [EdifactFormatVersion.FV2104]: "April 2021 (FV2104)",
  [EdifactFormatVersion.FV2110]: "Oktober 2021 (FV2110)",
  [EdifactFormatVersion.FV2210]: "Oktober 2022 (FV2210)",
  [EdifactFormatVersion.FV2304]: "April 2023 (FV2304)",
  [EdifactFormatVersion.FV2310]: "Oktober 2023 (FV2310)",
  [EdifactFormatVersion.FV2404]: "April 2024 (FV2404)",
  [EdifactFormatVersion.FV2410]: "Oktober 2024 (FV2410)",
  [EdifactFormatVersion.FV2504]: "Juni 2025 (FV2504)",
  [EdifactFormatVersion.FV2510]: "Oktober 2025 (FV2510)",
  [EdifactFormatVersion.FV2604]: "April 2026 (FV2604)",
  [EdifactFormatVersion.FV2610]: "Oktober 2026 (FV2610)",
};

/** Returns a human-readable German label for the given format version, e.g. "Oktober 2025 (FV2510)". */
export function getEdifactFormatVersionLabel(version: EdifactFormatVersion): string {
  return FORMAT_VERSION_LABELS[version];
}

/**
 * Returns the EdifactFormatVersion applicable for the given key date.
 * Accepts a UTC Date (compared as-is) or a CalendarDate (treated as midnight Europe/Berlin).
 */
export function getEdifactFormatVersion(keyDate: Date | CalendarDate): EdifactFormatVersion {
  const utcDate = keyDate instanceof Date ? keyDate : calendarDateToBerlinMidnight(keyDate);
  for (const [threshold, version] of FORMAT_VERSION_THRESHOLDS) {
    if (utcDate < threshold) {
      return version;
    }
  }
  return EdifactFormatVersion.FV2610;
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
      `Start date for ${version} is not known. Known versions: ${[...VALID_FROM_MAP.keys()].join(", ")}`
    );
  }
  return date;
}
