"use server";

import { isValidDateString } from "@/lib/schedule/datetime";
import { isGoogleSheetsConfigured } from "@/lib/sheets/config";
import { pushScheduleDateToSheets } from "@/lib/sheets/push";

/** Called after a successful daily save; failures are non-fatal. */
export type SheetsPushResult =
  | { status: "skipped" }
  | { status: "success"; rowCount: number }
  | { status: "failed" };

export async function tryPushScheduleToSheets(
  date: string,
  teamIds: string[],
): Promise<SheetsPushResult> {
  if (!isGoogleSheetsConfigured() || !isValidDateString(date) || teamIds.length === 0) {
    return { status: "skipped" };
  }

  try {
    const rowCount = await pushScheduleDateToSheets(date, teamIds);
    return { status: "success", rowCount };
  } catch {
    return { status: "failed" };
  }
}
