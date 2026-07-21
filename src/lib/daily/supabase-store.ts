import { randomUUID } from "crypto";

import { generateDailyEntriesFromTemplate } from "@/lib/daily/generate-from-template";
import { sortDailyEntries } from "@/lib/daily/sort";
import type { DailyEntry, DailySegment } from "@/lib/daily/types";
import { getEmployeeById } from "@/lib/employees/demo-store";
import { createSupabaseClient } from "@/lib/supabase/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ENTRY_SELECT = `
  id,
  schedule_date,
  team_id,
  employee_id,
  part_time_name,
  is_part_time,
  is_off,
  source,
  updated_at,
  employee:employees(name),
  segments:daily_schedule_segments(sort_order, time_in, time_out)
`;

interface ScheduleRow {
  id: string;
  schedule_date: string;
  team_id: string;
  employee_id: string | null;
  part_time_name: string | null;
  is_part_time: boolean;
  is_off: boolean;
  source: "template" | "manual";
  updated_at: string;
  employee: { name: string } | { name: string }[] | null;
  segments: { sort_order: number; time_in: string; time_out: string }[] | null;
}

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function mapRow(row: ScheduleRow): DailyEntry {
  const employee = unwrapRelation(row.employee);
  const segments = (row.segments ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((segment) => ({
      timeIn: segment.time_in.slice(0, 5),
      timeOut: segment.time_out.slice(0, 5),
    }));

  return {
    id: row.id,
    scheduleDate: row.schedule_date,
    teamId: row.team_id,
    employeeId: row.employee_id,
    employeeName:
      row.is_part_time && row.part_time_name
        ? row.part_time_name
        : employee?.name ?? "Unknown",
    partTimeName: row.part_time_name,
    isPartTime: row.is_part_time,
    isOff: row.is_off,
    source: row.source,
    segments,
    updatedAt: row.updated_at,
  };
}

function toDbTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

async function fetchEntries(teamId: string, date: string): Promise<DailyEntry[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("daily_schedules")
    .select(ENTRY_SELECT)
    .eq("team_id", teamId)
    .eq("schedule_date", date);

  if (error) throw new Error(error.message);
  return sortDailyEntries((data ?? []).map((row) => mapRow(row as ScheduleRow)));
}

async function deleteTeamDate(teamId: string, date: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("daily_schedules")
    .delete()
    .eq("team_id", teamId)
    .eq("schedule_date", date);

  if (error) throw new Error(error.message);
}

async function insertEntries(entries: DailyEntry[]): Promise<void> {
  if (entries.length === 0) return;

  const supabase = createSupabaseAdminClient();

  for (const entry of entries) {
    const { error: scheduleError } = await supabase.from("daily_schedules").insert({
      id: entry.id,
      schedule_date: entry.scheduleDate,
      team_id: entry.teamId,
      employee_id: entry.employeeId,
      part_time_name: entry.partTimeName,
      is_part_time: entry.isPartTime,
      is_off: entry.isOff,
      source: entry.source,
      updated_at: entry.updatedAt,
    });

    if (scheduleError) {
      throw new Error(
        `${scheduleError.message} (employee: ${entry.employeeName}). Run supabase/seed.sql on your Supabase project if teams/employees are missing.`,
      );
    }

    if (!entry.isOff && entry.segments.length > 0) {
      const { error: segmentError } = await supabase.from("daily_schedule_segments").insert(
        entry.segments.map((segment, index) => ({
          daily_schedule_id: entry.id,
          sort_order: index + 1,
          time_in: toDbTime(segment.timeIn),
          time_out: toDbTime(segment.timeOut),
        })),
      );

      if (segmentError) throw new Error(segmentError.message);
    }
  }
}

function buildValidatedEntries(input: {
  teamId: string;
  date: string;
  entries: Array<{
    id?: string;
    employeeId: string | null;
    employeeName: string;
    partTimeName: string | null;
    isPartTime: boolean;
    isOff: boolean;
    segments: DailySegment[];
    source?: "template" | "manual";
  }>;
}): DailyEntry[] {
  const now = new Date().toISOString();

  return input.entries.map((entry) => {
    const segments = entry.isOff
      ? []
      : entry.segments
          .filter((segment) => segment.timeIn && segment.timeOut)
          .slice(0, 3);

    if (!entry.isOff && segments.length === 0) {
      throw new Error(`${entry.employeeName}: working shifts need a time segment.`);
    }
    for (const segment of segments) {
      if (segment.timeIn >= segment.timeOut) {
        throw new Error(`${entry.employeeName}: time-in must be before time-out.`);
      }
    }

    return {
      id: entry.id ?? randomUUID(),
      scheduleDate: input.date,
      teamId: input.teamId,
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      partTimeName: entry.partTimeName,
      isPartTime: entry.isPartTime,
      isOff: entry.isOff,
      source: entry.source ?? "manual",
      segments,
      updatedAt: now,
    };
  });
}

/** Read from Supabase; if empty, build from template in memory (no DB write until Save day). */
export async function getOrCreateDailyEntries(
  teamId: string,
  date: string,
): Promise<DailyEntry[]> {
  const existing = await fetchEntries(teamId, date);
  if (existing.length > 0) return existing;

  return sortDailyEntries(await generateDailyEntriesFromTemplate(teamId, date));
}

export async function listDailyEntriesForDate(
  date: string,
  teamId?: string,
): Promise<DailyEntry[]> {
  const supabase = createSupabaseClient();
  let query = supabase
    .from("daily_schedules")
    .select(ENTRY_SELECT)
    .eq("schedule_date", date);

  if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return sortDailyEntries((data ?? []).map((row) => mapRow(row as ScheduleRow)));
}

export async function saveDailyEntries(input: {
  teamId: string;
  date: string;
  entries: Array<{
    id?: string;
    employeeId: string | null;
    employeeName: string;
    partTimeName: string | null;
    isPartTime: boolean;
    isOff: boolean;
    segments: DailySegment[];
    source?: "template" | "manual";
  }>;
}): Promise<DailyEntry[]> {
  const saved = buildValidatedEntries(input);
  await deleteTeamDate(input.teamId, input.date);
  await insertEntries(saved);
  return sortDailyEntries(saved);
}

export async function resetDailyToTemplate(
  teamId: string,
  date: string,
): Promise<DailyEntry[]> {
  await deleteTeamDate(teamId, date);
  return getOrCreateDailyEntries(teamId, date);
}

export async function addPartTimeEntry(input: {
  teamId: string;
  date: string;
  employeeId: string;
}): Promise<DailyEntry> {
  const employee = getEmployeeById(input.employeeId);
  if (!employee || !employee.active) {
    throw new Error("Employee not found.");
  }
  if (employee.employmentType !== "part_time") {
    throw new Error("Choose a part-time employee from the roster.");
  }
  if (employee.teamId !== input.teamId) {
    throw new Error("Employee is not on this team.");
  }

  const existing = await fetchEntries(input.teamId, input.date);
  if (existing.some((entry) => entry.employeeId === employee.id)) {
    throw new Error(`${employee.name} is already on this day's schedule.`);
  }

  const entry: DailyEntry = {
    id: randomUUID(),
    scheduleDate: input.date,
    teamId: input.teamId,
    employeeId: employee.id,
    employeeName: employee.name,
    partTimeName: null,
    isPartTime: true,
    isOff: false,
    source: "manual",
    segments: [{ timeIn: "09:00", timeOut: "17:00" }],
    updatedAt: new Date().toISOString(),
  };

  await insertEntries([entry]);
  return entry;
}

export async function removeDailyEntry(entryId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("daily_schedules").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
}
