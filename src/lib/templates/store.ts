import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

import * as demoStore from "@/lib/templates/demo-store";
import * as supabaseStore from "@/lib/templates/supabase-store";
import type { TemplateShift, TemplateVersion } from "@/lib/templates/types";

const MISSING_SERVICE_ROLE_MESSAGE =
  "Add SUPABASE_SERVICE_ROLE_KEY to Vercel to save weekly templates.";

function useSupabaseTemplates(): boolean {
  return isSupabaseConfigured() && isSupabaseAdminConfigured();
}

export async function listTemplateVersions(teamId: string): Promise<TemplateVersion[]> {
  if (useSupabaseTemplates()) {
    try {
      return await supabaseStore.listTemplateVersions(teamId);
    } catch (error) {
      console.error("Supabase template list failed:", error);
    }
  }
  return demoStore.listTemplateVersions(teamId);
}

export async function getTemplateVersion(
  versionId: string,
): Promise<TemplateVersion | null> {
  if (useSupabaseTemplates()) {
    try {
      return await supabaseStore.getTemplateVersion(versionId);
    } catch (error) {
      console.error("Supabase template fetch failed:", error);
    }
  }
  return demoStore.getTemplateVersion(versionId);
}

export async function getTemplateVersionForDate(
  teamId: string,
  date: string,
): Promise<TemplateVersion | null> {
  if (useSupabaseTemplates()) {
    try {
      return await supabaseStore.getTemplateVersionForDate(teamId, date);
    } catch (error) {
      console.error("Supabase template-for-date failed:", error);
    }
  }
  return demoStore.getTemplateVersionForDate(teamId, date);
}

export function getShiftsForDay(
  version: TemplateVersion,
  dayOfWeek: number,
): TemplateShift[] {
  return demoStore.getShiftsForDay(version, dayOfWeek);
}

export async function createTemplateVersion(input: {
  teamId: string;
  versionLabel: string;
  effectiveFrom: string;
  notes?: string;
  copyFromVersionId?: string;
}): Promise<TemplateVersion> {
  if (useSupabaseTemplates()) {
    return supabaseStore.createTemplateVersion(input);
  }
  if (process.env.VERCEL && isSupabaseConfigured()) {
    throw new Error(MISSING_SERVICE_ROLE_MESSAGE);
  }
  return demoStore.createTemplateVersion(input);
}

export async function saveDayShifts(input: {
  versionId: string;
  dayOfWeek: number;
  shifts: Array<{
    employeeId: string;
    isOff: boolean;
    segments: Array<{ timeIn: string; timeOut: string }>;
  }>;
}): Promise<TemplateVersion> {
  if (useSupabaseTemplates()) {
    return supabaseStore.saveDayShifts(input);
  }
  if (process.env.VERCEL && isSupabaseConfigured()) {
    throw new Error(MISSING_SERVICE_ROLE_MESSAGE);
  }
  return demoStore.saveDayShifts(input);
}
