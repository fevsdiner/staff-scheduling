import { isValidDateString } from "@/lib/schedule/datetime";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Parse optional MM/DD/YYYY (also M/D/YYYY) into ISO YYYY-MM-DD. Empty → null. */
export function parseBirthdayInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isValidDateString(trimmed)) {
    return trimmed;
  }

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) {
    throw new Error("Birthday must be MM/DD/YYYY.");
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new Error("Birthday must be a valid date (MM/DD/YYYY).");
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Display ISO YYYY-MM-DD as MM/DD/YYYY. */
export function formatBirthdayDisplay(iso: string | null | undefined): string {
  if (!iso || !isValidDateString(iso)) return "—";
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

/** True when birthday month/day matches the schedule date (year ignored). */
export function isBirthdayOnDate(
  birthdayIso: string | null | undefined,
  scheduleDate: string,
): boolean {
  if (!birthdayIso || !isValidDateString(birthdayIso) || !isValidDateString(scheduleDate)) {
    return false;
  }
  return birthdayIso.slice(5) === scheduleDate.slice(5);
}
