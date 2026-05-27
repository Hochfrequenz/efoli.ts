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
];

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
  return EdifactFormatVersion.FV2604;
}

/** Returns the EdifactFormatVersion valid as of right now. */
export function getCurrentEdifactFormatVersion(): EdifactFormatVersion {
  return getEdifactFormatVersion(new Date());
}
