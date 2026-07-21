export interface DailySegment {
  timeIn: string;
  timeOut: string;
}

export interface DailyEntry {
  id: string;
  scheduleDate: string;
  teamId: string;
  employeeId: string | null;
  employeeName: string;
  partTimeName: string | null;
  isPartTime: boolean;
  isOff: boolean;
  source: "template" | "manual";
  segments: DailySegment[];
  updatedAt: string;
}

export interface DailyStore {
  entries: DailyEntry[];
}
