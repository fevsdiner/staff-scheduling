import { formatShortDay } from "@/lib/schedule/datetime";
import { getDemoTeams } from "@/lib/schedule/demo-data";
import type { DaySchedule, ScheduleEntry, TeamSchedule } from "@/lib/schedule/types";
import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatEmployeeDisplayName } from "@/lib/employees/display";
import { listDailyEntriesForDate } from "@/lib/daily/store";
import { TEAM_OPTIONS, teamById, teamBySlug } from "@/lib/employees/types";

async function getLocalSchedule(date: string, teamFilter: string): Promise<DaySchedule> {
  const teamId = teamFilter === "all" ? undefined : teamBySlug(teamFilter)?.id;
  const entries = await listDailyEntriesForDate(date, teamId);

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
      isSwapOff: entry.isSwapOff ?? false,
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
  return getLocalSchedule(date, teamFilter);
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
