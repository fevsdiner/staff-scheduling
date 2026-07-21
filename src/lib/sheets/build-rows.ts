import { format, parseISO } from "date-fns";

import { getOrCreateDailyEntries } from "@/lib/daily/demo-store";
import type { DailyEntry } from "@/lib/daily/types";
import { sortDailyEntries } from "@/lib/daily/sort";
import { TEAM_OPTIONS, teamById } from "@/lib/employees/types";

export const SHEET_HEADER = [
  "Date",
  "Day",
  "Team",
  "Employee Name",
  "Type",
  "TIME-IN (1)",
  "TIME-OUT (1)",
  "TIME-IN (2)",
  "TIME-OUT (2)",
] as const;

const TEAM_SORT_ORDER = new Map(TEAM_OPTIONS.map((team, index) => [team.name, index]));

function entryToRow(date: string, dayName: string, entry: DailyEntry): string[] {
  const team = teamById(entry.teamId);
  const type = entry.isPartTime ? "Part-Time" : "Regular";

  if (entry.isOff) {
    return [
      date,
      dayName,
      team?.name ?? "",
      entry.employeeName,
      type,
      "-",
      "-",
      "-",
      "-",
    ];
  }

  const [seg0, seg1] = entry.segments;

  return [
    date,
    dayName,
    team?.name ?? "",
    entry.employeeName,
    type,
    seg0?.timeIn ?? "-",
    seg0?.timeOut ?? "-",
    seg1?.timeIn ?? "-",
    seg1?.timeOut ?? "-",
  ];
}

/** Data rows for one date and selected teams only, without the header row. */
export function buildDataRowsForDate(date: string, teamIds: string[]): string[][] {
  const allowedTeamIds = new Set(teamIds);
  const dayName = format(parseISO(date), "EEEE");
  const rows: string[][] = [];

  for (const team of TEAM_OPTIONS) {
    if (!allowedTeamIds.has(team.id)) continue;

    const teamEntries = sortDailyEntries(getOrCreateDailyEntries(team.id, date));
    for (const entry of teamEntries) {
      rows.push(entryToRow(date, dayName, entry));
    }
  }

  return rows;
}

/** Header + data rows for one date (used when seeding an empty sheet). */
export function buildSheetRowsForDate(date: string, teamIds: string[]): string[][] {
  return [Array.from(SHEET_HEADER), ...buildDataRowsForDate(date, teamIds)];
}

export function sortSheetDataRows(rows: string[][]): string[][] {
  return [...rows].sort((a, b) => {
    const dateCompare = String(a[0]).localeCompare(String(b[0]));
    if (dateCompare !== 0) return dateCompare;

    const teamA = TEAM_SORT_ORDER.get(a[2] ?? "") ?? 99;
    const teamB = TEAM_SORT_ORDER.get(b[2] ?? "") ?? 99;
    if (teamA !== teamB) return teamA - teamB;

    return String(a[3]).localeCompare(String(b[3]));
  });
}
