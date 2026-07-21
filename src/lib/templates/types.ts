export interface TemplateSegment {
  timeIn: string;
  timeOut: string;
}

export interface TemplateShift {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  isOff: boolean;
  segments: TemplateSegment[];
}

export interface TemplateVersion {
  id: string;
  teamId: string;
  versionLabel: string;
  effectiveFrom: string;
  notes: string;
  createdAt: string;
  shifts: TemplateShift[];
}

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sun", full: "Sunday" },
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
] as const;

export const MAX_SEGMENTS = 3;
