import { canUseFileDataStore } from "@/lib/env";
import * as dailyDemoStore from "@/lib/daily/demo-store";
import * as supabaseStore from "@/lib/employees/supabase-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { syncSheetsForScheduleDates } from "@/lib/sheets/sync-dates";
import type { SheetsPushResult } from "@/lib/sheets/actions";

/** Update copied names in local daily JSON and refresh Google Sheets rows. */
export async function propagateEmployeeRename(
  employeeId: string,
  newName: string,
): Promise<SheetsPushResult | null> {
  const dates = new Set<string>();

  if (canUseFileDataStore()) {
    for (const date of dailyDemoStore.patchDailyScheduleEmployeeName(employeeId, newName)) {
      dates.add(date);
    }
  }

  if (isSupabaseConfigured()) {
    try {
      for (const date of await supabaseStore.listScheduleDatesForEmployee(employeeId)) {
        dates.add(date);
      }
    } catch (error) {
      console.error("Could not list Supabase schedule dates for rename:", error);
    }
  }

  if (dates.size === 0) return null;

  return syncSheetsForScheduleDates([...dates].sort());
}
