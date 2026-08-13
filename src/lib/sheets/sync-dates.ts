import { listDailyEntriesForDate } from "@/lib/daily/store";
import { isValidDateString } from "@/lib/schedule/datetime";
import { isGoogleSheetsConfigured } from "@/lib/sheets/config";
import { pushScheduleDateToSheets } from "@/lib/sheets/push";

import type { SheetsPushResult } from "@/lib/sheets/actions";

/** Re-export row counts for rename propagation and bulk fixes. */
export async function syncSheetsForScheduleDates(
  dates: string[],
): Promise<SheetsPushResult> {
  if (!isGoogleSheetsConfigured()) {
    return { status: "skipped" };
  }

  let totalRows = 0;
  for (const date of dates) {
    if (!isValidDateString(date)) continue;

    const entries = await listDailyEntriesForDate(date);
    const teamIds = [...new Set(entries.map((entry) => entry.teamId))];
    if (teamIds.length === 0) continue;

    try {
      totalRows += await pushScheduleDateToSheets(date, teamIds);
    } catch {
      return { status: "failed" };
    }
  }

  if (totalRows === 0) {
    return { status: "skipped" };
  }

  return { status: "success", rowCount: totalRows };
}
