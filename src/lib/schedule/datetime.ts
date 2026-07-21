import { addDays, format, parseISO } from "date-fns";

export const TIMEZONE = "Asia/Manila";

export function getManilaDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);
}

export function getManilaTomorrow(): string {
  const today = getManilaDateString();
  return format(addDays(parseISO(today), 1), "yyyy-MM-dd");
}

export function formatDisplayDate(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, "EEEE, MMM d, yyyy");
}

export function formatShortDay(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, "EEE");
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatSegmentRange(segment: { timeIn: string; timeOut: string }): string {
  return `${formatTime(segment.timeIn)} – ${formatTime(segment.timeOut)}`;
}

export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

/** Calendar day-of-week for a YYYY-MM-DD date (0=Sun … 6=Sat), timezone-safe. */
export function dayOfWeekFromDateString(dateString: string): number {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}
