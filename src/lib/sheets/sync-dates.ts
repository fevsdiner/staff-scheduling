import { isGoogleSheetsConfigured } from "@/lib/sheets/config";
import { pushAllSavedSchedulesToSheets } from "@/lib/sheets/push";

import type { SheetsPushResult } from "@/lib/sheets/actions";

/** Full-sheet sync for rename propagation and bulk fixes. */
export async function syncSheetsForScheduleDates(
  _dates: string[],
): Promise<SheetsPushResult> {
  if (!isGoogleSheetsConfigured()) {
    return { status: "skipped" };
  }

  try {
    const { dateCount, rowCount } = await pushAllSavedSchedulesToSheets();
    if (rowCount === 0) {
      return { status: "skipped" };
    }
    return { status: "success", rowCount, dateCount };
  } catch {
    return { status: "failed" };
  }
}
