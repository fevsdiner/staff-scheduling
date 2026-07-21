import { formatShortDay } from "@/lib/schedule/datetime";
import { getDemoTeams } from "@/lib/schedule/demo-data";
import type { DaySchedule, ScheduleEntry, TeamSchedule } from "@/lib/schedule/types";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatEmployeeDisplayName } from "@/lib/employees/display";
import { ensureAllTeamsForDate } from "@/lib/daily/demo-store";
import { TEAM_OPTIONS, teamById } from "@/lib/employees/types";

interface ScheduleRow {
  id: string;
  is_off: boolean;
  is_part_time: boolean;
  part_time_name: string | null;
  source: "template" | "manual";
  team: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
  employee: { name: string } | { name: string }[] | null;
  segments: { sort_order: number; time_in: string; time_out: string }[] | null;
}

interface NormalizedScheduleRow extends Omit<ScheduleRow, "team" | "employee"> {
  team: { id: string; name: string; slug: string } | null;
  employee: { name: string } | null;
}

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeRow(row: ScheduleRow): NormalizedScheduleRow {
  return {
    ...row,
    team: unwrapRelation(row.team),
    employee: unwrapRelation(row.employee),
  };
}

function mapEntry(row: NormalizedScheduleRow): ScheduleEntry | null {
  if (!row.team) return null;

  const baseName = row.is_part_time
    ? row.part_time_name ?? row.employee?.name ?? "Part-time"
    : row.employee?.name ?? "Unknown";

  const name = formatEmployeeDisplayName(baseName, row.is_part_time);

  const segments = (row.segments ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((segment) => ({
      timeIn: segment.time_in.slice(0, 5),
      timeOut: segment.time_out.slice(0, 5),
    }));

  return {
    id: row.id,
    name,
    isOff: row.is_off,
    isPartTime: row.is_part_time,
    segments,
    source: row.source,
  };
}

function groupScheduleRows(rows: ScheduleRow[], date: string): DaySchedule {
  const teamMap = new Map<string, TeamSchedule>();

  for (const row of rows) {
    const normalized = normalizeRow(row);
    if (!normalized.team) continue;

    const entry = mapEntry(normalized);
    if (!entry) continue;

    const existing = teamMap.get(normalized.team.slug);
    if (existing) {
      existing.entries.push(entry);
      continue;
    }

    teamMap.set(normalized.team.slug, {
      id: normalized.team.id,
      name: normalized.team.name,
      slug: normalized.team.slug,
      entries: [entry],
    });
  }

  const teams = Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    date,
    dayLabel: formatShortDay(date),
    teams,
  };
}

async function fetchFromSupabase(date: string, teamFilter: string): Promise<DaySchedule> {
  const supabase = createSupabaseClient();

  let query = supabase
    .from("daily_schedules")
    .select(
      `
        id,
        is_off,
        is_part_time,
        part_time_name,
        source,
        team:teams(id, name, slug),
        employee:employees(name),
        segments:daily_schedule_segments(sort_order, time_in, time_out)
      `,
    )
    .eq("schedule_date", date)
    .order("team_id");

  if (teamFilter !== "all") {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .eq("slug", teamFilter)
      .single();

    if (teamError) {
      throw new Error(teamError.message);
    }

    query = query.eq("team_id", team.id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return groupScheduleRows((data ?? []) as unknown as ScheduleRow[], date);
}

function getLocalSchedule(date: string, teamFilter: string): DaySchedule {
  const entries = ensureAllTeamsForDate(date).filter((entry) => {
    if (teamFilter === "all") return true;
    const team = teamById(entry.teamId);
    return team?.slug === teamFilter;
  });

  const teamMap = new Map<string, TeamSchedule>();

  for (const team of TEAM_OPTIONS) {
    if (teamFilter !== "all" && team.slug !== teamFilter) continue;
    teamMap.set(team.slug, {
      id: team.id,
      name: team.name,
      slug: team.slug,
      entries: [],
    });
  }

  for (const entry of entries) {
    const team = teamById(entry.teamId);
    if (!team) continue;
    const bucket = teamMap.get(team.slug);
    if (!bucket) continue;

    const mapped: ScheduleEntry = {
      id: entry.id,
      name: formatEmployeeDisplayName(entry.employeeName, entry.isPartTime),
      isOff: entry.isOff,
      isPartTime: entry.isPartTime,
      segments: entry.segments,
      source: entry.source,
    };
    bucket.entries.push(mapped);
  }

  const teams = Array.from(teamMap.values())
    .map((team) => ({
      ...team,
      entries: team.entries.sort((a, b) => {
        if (a.isPartTime !== b.isPartTime) {
          return a.isPartTime ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
      }),
    }))
    .filter((team) => team.entries.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    date,
    dayLabel: formatShortDay(date),
    teams,
  };
}

export async function getScheduleForDate(
  date: string,
  teamFilter: string = "all",
): Promise<DaySchedule> {
  if (!isSupabaseConfigured()) {
    return getLocalSchedule(date, teamFilter);
  }

  return fetchFromSupabase(date, teamFilter);
}

export async function getTeamOptions() {
  if (!isSupabaseConfigured()) {
    return getDemoTeams();
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase.from("teams").select("name, slug").order("name");

  if (error) {
    throw new Error(error.message);
  }

  return [{ name: "All teams", slug: "all" }, ...(data ?? [])];
}

export function isUsingDemoData(): boolean {
  return !isSupabaseConfigured();
}
