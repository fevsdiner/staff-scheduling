"use server";

import { isValidDateString } from "@/lib/schedule/datetime";
import { isGoogleSheetsConfigured } from "@/lib/sheets/config";
import { pushAllSavedSchedulesToSheets } from "@/lib/sheets/push";

/** Called after a successful daily save; failures are non-fatal. */
export type SheetsPushResult =
  | { status: "skipped" }
  | { status: "success"; rowCount: number; dateCount?: number }
  | { status: "failed" };

/** Rebuild Google Sheets from every saved schedule date in the app. */
export async function tryPushAllSavedSchedulesToSheets(): Promise<SheetsPushResult> {
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

/**
 * After a day save, refresh the whole sheet so all previously saved dates
 * stay in sync — supervisors no longer need to re-save each date.
 */
export async function tryPushScheduleToSheets(
  date: string,
  teamIds: string[],
): Promise<SheetsPushResult> {
  if (!isGoogleSheetsConfigured() || !isValidDateString(date) || teamIds.length === 0) {
    return { status: "skipped" };
  }

  return tryPushAllSavedSchedulesToSheets();
}
