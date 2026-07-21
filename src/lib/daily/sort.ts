import type { DailyEntry } from "@/lib/daily/types";

/** Regular employees first (A–Z), then part-time employees at the bottom (A–Z). */
export function sortDailyEntries(entries: DailyEntry[]): DailyEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isPartTime !== b.isPartTime) {
      return a.isPartTime ? 1 : -1;
    }
    return a.employeeName.localeCompare(b.employeeName);
  });
}
