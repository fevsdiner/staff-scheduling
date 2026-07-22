import { formatTime } from "@/lib/schedule/datetime";

export interface ShiftSegment {
  timeIn: string;
  timeOut: string;
}

export interface SegmentFieldValidation {
  timeInError: boolean;
  timeOutError: boolean;
  message: string | null;
}

export interface ShiftSegmentValidation {
  segments: SegmentFieldValidation[];
  hasErrors: boolean;
}

const MINUTES_PER_DAY = 24 * 60;

function timeToMinutes(time: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatOverlapRange(startMinutes: number, endMinutes: number): string {
  return `${formatTime(minutesToTime(startMinutes))} – ${formatTime(minutesToTime(endMinutes))}`;
}

function isValidSameDayRange(start: number, end: number): boolean {
  return end > start && end < MINUTES_PER_DAY;
}

/** Pick which single field is most likely wrong when time-out is not after time-in. */
function pickInvalidRangeField(start: number, end: number): "timeIn" | "timeOut" {
  const outPlusTwelve = end + 720;
  if (outPlusTwelve < MINUTES_PER_DAY && isValidSameDayRange(start, outPlusTwelve)) {
    return "timeOut";
  }

  const inMinusTwelve = start - 720;
  if (inMinusTwelve >= 0 && isValidSameDayRange(inMinusTwelve, end)) {
    return "timeIn";
  }

  return "timeIn";
}

function isTimeFilled(time: string): boolean {
  return Boolean(time.trim());
}

function emptySegmentValidation(): SegmentFieldValidation {
  return { timeInError: false, timeOutError: false, message: null };
}

export function validateShiftSegments(
  segments: ShiftSegment[],
  contextLabel?: string,
): ShiftSegmentValidation {
  const prefix = contextLabel ? `${contextLabel}: ` : "";
  const results: SegmentFieldValidation[] = segments.map(() => emptySegmentValidation());
  let hasErrors = false;

  const parsed: Array<{ start: number; end: number; index: number } | null> = [];

  for (let index = 0; index < segments.length; index += 1) {
    const { timeIn, timeOut } = segments[index];
    const inFilled = isTimeFilled(timeIn);
    const outFilled = isTimeFilled(timeOut);

    if (!inFilled && !outFilled) {
      results[index] = {
        timeInError: true,
        timeOutError: true,
        message: `${prefix}Enter both time-in and time-out.`,
      };
      hasErrors = true;
      parsed.push(null);
      continue;
    }

    if (inFilled !== outFilled) {
      results[index] = {
        timeInError: !inFilled,
        timeOutError: !outFilled,
        message: !inFilled
          ? `${prefix}Enter time-in.`
          : `${prefix}Enter time-out.`,
      };
      hasErrors = true;
      parsed.push(null);
      continue;
    }

    const start = timeToMinutes(timeIn);
    const end = timeToMinutes(timeOut);
    if (start === null || end === null) {
      results[index] = {
        timeInError: start === null,
        timeOutError: end === null,
        message: `${prefix}Enter a valid time.`,
      };
      hasErrors = true;
      parsed.push(null);
      continue;
    }

    if (end <= start) {
      const invalidField = pickInvalidRangeField(start, end);
      results[index] = {
        timeInError: invalidField === "timeIn",
        timeOutError: invalidField === "timeOut",
        message: `${prefix}Time-out must be later than time-in on the same day.`,
      };
      hasErrors = true;
      parsed.push({ start, end, index });
      continue;
    }

    parsed.push({ start, end, index });
  }

  const complete = parsed.filter(
    (segment): segment is { start: number; end: number; index: number } =>
      segment !== null && results[segment.index].message === null,
  );

  for (let a = 0; a < complete.length; a += 1) {
    for (let b = a + 1; b < complete.length; b += 1) {
      const first = complete[a];
      const second = complete[b];
      const overlapStart = Math.max(first.start, second.start);
      const overlapEnd = Math.min(first.end, second.end);

      if (overlapStart < overlapEnd) {
        const overlapLabel = formatOverlapRange(overlapStart, overlapEnd);
        const [earlier, later] =
          first.start <= second.start ? [first, second] : [second, first];

        const earlierMessage = `${prefix}This block overlaps with block ${later.index + 1} (${overlapLabel}).`;
        const laterMessage = `${prefix}This block overlaps with block ${earlier.index + 1} (${overlapLabel}).`;

        results[earlier.index] = {
          timeInError: results[earlier.index].timeInError,
          timeOutError: true,
          message: earlierMessage,
        };
        results[later.index] = {
          timeInError: true,
          timeOutError: results[later.index].timeOutError,
          message: laterMessage,
        };
        hasErrors = true;
      }
    }
  }

  return { segments: results, hasErrors };
}

export function assertValidShiftSegments(
  segments: ShiftSegment[],
  contextLabel?: string,
): void {
  const result = validateShiftSegments(segments, contextLabel);
  if (result.hasErrors) {
    throw new Error(
      result.segments.find((segment) => segment.message)?.message ??
        "Invalid time segments.",
    );
  }
}
