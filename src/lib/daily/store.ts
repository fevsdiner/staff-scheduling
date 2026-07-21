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

function useSupabaseDailyStore(): boolean {
  return isSupabaseAdminConfigured();
}

function ensureDatabaseWriteConfig(): void {
  if (process.env.VERCEL && isSupabaseConfigured() && !isSupabaseAdminConfigured()) {
    throw new Error(
      "Add SUPABASE_SERVICE_ROLE_KEY to Vercel (Supabase → Settings → API → service_role). The anon key can read schedules but cannot save admin changes.",
    );
  }
}

export async function getOrCreateDailyEntries(
  teamId: string,
  date: string,
): Promise<DailyEntry[]> {
  if (useSupabaseDailyStore()) {
    return supabaseStore.getOrCreateDailyEntries(teamId, date);
  }
  return demoStore.getOrCreateDailyEntries(teamId, date);
}

export async function listDailyEntriesForDate(
  date: string,
  teamId?: string,
): Promise<DailyEntry[]> {
  if (useSupabaseDailyStore()) {
    return supabaseStore.listDailyEntriesForDate(date, teamId);
  }
  return demoStore.listDailyEntriesForDate(date, teamId);
}

export async function ensureAllTeamsForDate(date: string): Promise<DailyEntry[]> {
  if (useSupabaseDailyStore()) {
    return supabaseStore.ensureAllTeamsForDate(date);
  }
  return demoStore.ensureAllTeamsForDate(date);
}

export async function saveDailyEntries(input: SaveInput): Promise<DailyEntry[]> {
  ensureDatabaseWriteConfig();
  if (useSupabaseDailyStore()) {
    return supabaseStore.saveDailyEntries(input);
  }
  return demoStore.saveDailyEntries(input);
}

export async function resetDailyToTemplate(
  teamId: string,
  date: string,
): Promise<DailyEntry[]> {
  ensureDatabaseWriteConfig();
  if (useSupabaseDailyStore()) {
    return supabaseStore.resetDailyToTemplate(teamId, date);
  }
  return demoStore.resetDailyToTemplate(teamId, date);
}

export async function addPartTimeEntry(input: {
  teamId: string;
  date: string;
  employeeId: string;
}): Promise<DailyEntry> {
  ensureDatabaseWriteConfig();
  if (useSupabaseDailyStore()) {
    return supabaseStore.addPartTimeEntry(input);
  }
  return demoStore.addPartTimeEntry(input);
}

export async function removeDailyEntry(entryId: string): Promise<void> {
  ensureDatabaseWriteConfig();
  if (useSupabaseDailyStore()) {
    return supabaseStore.removeDailyEntry(entryId);
  }
  demoStore.removeDailyEntry(entryId);
}
