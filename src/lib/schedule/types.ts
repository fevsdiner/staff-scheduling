export type TeamSlug = "kitchen" | "dining" | "ojt" | "all";

export interface ScheduleSegment {
  timeIn: string;
  timeOut: string;
}

export interface ScheduleEntry {
  id: string;
  name: string;
  isOff: boolean;
  isSwapOff: boolean;
  isPartTime: boolean;
  segments: ScheduleSegment[];
  source: "template" | "manual";
}

export interface TeamSchedule {
  id: string;
  name: string;
  slug: string;
  entries: ScheduleEntry[];
}

export interface DaySchedule {
  date: string;
  dayLabel: string;
  teams: TeamSchedule[];
}
