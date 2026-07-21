import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

import * as demoStore from "@/lib/daily/demo-store";
import * as supabaseStore from "@/lib/daily/supabase-store";
import type { DailyEntry, DailySegment } from "@/lib/daily/types";

type SaveInput = {
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
};

const MISSING_SERVICE_ROLE_MESSAGE =
  "Add SUPABASE_SERVICE_ROLE_KEY to Vercel (Supabase → Settings → API → service_role). The anon key reads schedules but cannot save admin changes.";

export async function getOrCreateDailyEntries(
  teamId: string,
  date: string,
): Promise<DailyEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      return await supabaseStore.getOrCreateDailyEntries(teamId, date);
    } catch (error) {
      console.error("Supabase daily read failed:", error);
    }
  }
  return demoStore.getOrCreateDailyEntries(teamId, date);
}

export async function listDailyEntriesForDate(
  date: string,
  teamId?: string,
): Promise<DailyEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      return await supabaseStore.listDailyEntriesForDate(date, teamId);
    } catch (error) {
      console.error("Supabase daily list failed:", error);
    }
  }
  return demoStore.listDailyEntriesForDate(date, teamId);
}

export async function ensureAllTeamsForDate(date: string): Promise<DailyEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const { TEAM_OPTIONS } = await import("@/lib/employees/types");
      const entries: DailyEntry[] = [];
      for (const team of TEAM_OPTIONS) {
        entries.push(...(await supabaseStore.getOrCreateDailyEntries(team.id, date)));
      }
      return entries;
    } catch (error) {
      console.error("Supabase ensure-all-teams failed:", error);
    }
  }
  return demoStore.ensureAllTeamsForDate(date);
}

export async function saveDailyEntries(input: SaveInput): Promise<DailyEntry[]> {
  if (isSupabaseAdminConfigured()) {
    return supabaseStore.saveDailyEntries(input);
  }
  if (process.env.VERCEL && isSupabaseConfigured()) {
    throw new Error(MISSING_SERVICE_ROLE_MESSAGE);
  }
  return demoStore.saveDailyEntries(input);
}

export async function resetDailyToTemplate(
  teamId: string,
  date: string,
): Promise<DailyEntry[]> {
  if (isSupabaseAdminConfigured()) {
    return supabaseStore.resetDailyToTemplate(teamId, date);
  }
  if (process.env.VERCEL && isSupabaseConfigured()) {
    throw new Error(MISSING_SERVICE_ROLE_MESSAGE);
  }
  return demoStore.resetDailyToTemplate(teamId, date);
}

export async function addPartTimeEntry(input: {
  teamId: string;
  date: string;
  employeeId: string;
}): Promise<DailyEntry> {
  if (isSupabaseAdminConfigured()) {
    return supabaseStore.addPartTimeEntry(input);
  }
  if (process.env.VERCEL && isSupabaseConfigured()) {
    throw new Error(MISSING_SERVICE_ROLE_MESSAGE);
  }
  return demoStore.addPartTimeEntry(input);
}

export async function removeDailyEntry(entryId: string): Promise<void> {
  if (isSupabaseAdminConfigured()) {
    return supabaseStore.removeDailyEntry(entryId);
  }
  if (process.env.VERCEL && isSupabaseConfigured()) {
    throw new Error(MISSING_SERVICE_ROLE_MESSAGE);
  }
  demoStore.removeDailyEntry(entryId);
}
