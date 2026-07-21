import { google } from "googleapis";

import {
  buildDataRowsForDate,
  SHEET_HEADER,
  sortSheetDataRows,
} from "@/lib/sheets/build-rows";
import { getGoogleSheetsConfig } from "@/lib/sheets/config";
import { teamById } from "@/lib/employees/types";

const HEADER_ROW = Array.from(SHEET_HEADER);

/** Keep other dates and other teams; replace only the saved team block(s) for this date. */
export function mergeScheduleIntoSheet(
  existing: string[][],
  date: string,
  teamNames: string[],
  newDateRows: string[][],
): string[][] {
  const teamsBeingUpdated = new Set(teamNames);
  let dataRows: string[][] = [];

  if (existing.length > 0) {
    const [firstRow, ...rest] = existing;
    const hasHeader = firstRow?.[0] === HEADER_ROW[0];
    dataRows = hasHeader ? rest : existing;
  }

  dataRows = dataRows.filter((row) => {
    if (row[0] !== date) return true;
    return !teamsBeingUpdated.has(row[2] ?? "");
  });
  dataRows.push(...newDateRows);
  dataRows = sortSheetDataRows(dataRows);

  return [HEADER_ROW, ...dataRows];
}

export async function pushScheduleDateToSheets(
  date: string,
  teamIds: string[],
): Promise<number> {
  const { spreadsheetId, tabName, serviceAccountJson } = getGoogleSheetsConfig();
  const credentials = JSON.parse(serviceAccountJson) as {
    client_email: string;
    private_key: string;
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const newDateRows = await buildDataRowsForDate(date, teamIds);
  const teamNames = teamIds
    .map((teamId) => teamById(teamId)?.name)
    .filter((name): name is string => Boolean(name));
  const range = `${tabName}!A:I`;

  const existingResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const existing = (existingResponse.data.values as string[][]) ?? [];
  const merged = mergeScheduleIntoSheet(existing, date, teamNames, newDateRows);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: merged },
  });

  return newDateRows.length;
}
