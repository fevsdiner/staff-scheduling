import { formatTime } from "@/lib/schedule/datetime";

export interface ShiftSegment {
  timeIn: string;
  timeOut: string;
}

export interface ShiftSegmentValidation {
  segmentErrors: (string | null)[];
  hasErrors: boolean;
}

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

export function validateShiftSegments(
  segments: ShiftSegment[],
  contextLabel?: string,
): ShiftSegmentValidation {
  const prefix = contextLabel ? `${contextLabel}: ` : "";
  const segmentErrors: (string | null)[] = segments.map(() => null);
  let hasErrors = false;

  const parsed: Array<{ start: number; end: number; index: number } | null> = [];

  for (let index = 0; index < segments.length; index += 1) {
    const { timeIn, timeOut } = segments[index];
    const inFilled = Boolean(timeIn);
    const outFilled = Boolean(timeOut);

    if (!inFilled && !outFilled) {
      parsed.push(null);
      continue;
    }

    if (inFilled !== outFilled) {
      segmentErrors[index] = `${prefix}Enter both time-in and time-out.`;
      hasErrors = true;
      parsed.push(null);
      continue;
    }

    const start = timeToMinutes(timeIn);
    const end = timeToMinutes(timeOut);
    if (start === null || end === null) {
      segmentErrors[index] = `${prefix}Enter a valid time.`;
      hasErrors = true;
      parsed.push(null);
      continue;
    }

    if (end <= start) {
      segmentErrors[index] =
        `${prefix}Time-out must be later than time-in on the same day.`;
      hasErrors = true;
      parsed.push({ start, end, index });
      continue;
    }

    parsed.push({ start, end, index });
  }

  const complete = parsed.filter(
    (segment): segment is { start: number; end: number; index: number } =>
      segment !== null && segmentErrors[segment.index] === null,
  );

  for (let a = 0; a < complete.length; a += 1) {
    for (let b = a + 1; b < complete.length; b += 1) {
      const first = complete[a];
      const second = complete[b];
      const overlapStart = Math.max(first.start, second.start);
      const overlapEnd = Math.min(first.end, second.end);

      if (overlapStart < overlapEnd) {
        const overlapLabel = formatOverlapRange(overlapStart, overlapEnd);
        segmentErrors[first.index] =
          `${prefix}This block overlaps with block ${second.index + 1} (${overlapLabel}).`;
        segmentErrors[second.index] =
          `${prefix}This block overlaps with block ${first.index + 1} (${overlapLabel}).`;
        hasErrors = true;
      }
    }
  }

  return { segmentErrors, hasErrors };
}

export function assertValidShiftSegments(
  segments: ShiftSegment[],
  contextLabel?: string,
): void {
  const result = validateShiftSegments(segments, contextLabel);
  if (result.hasErrors) {
    throw new Error(result.segmentErrors.find(Boolean) ?? "Invalid time segments.");
  }
}
