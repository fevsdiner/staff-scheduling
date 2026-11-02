import { google } from "googleapis";

import { listDailyEntriesForDate, listSavedScheduleDates } from "@/lib/daily/store";
import {
  buildDataRowsForDate,
  SHEET_HEADER,
  sortSheetDataRows,
} from "@/lib/sheets/build-rows";
import { getGoogleSheetsConfig } from "@/lib/sheets/config";
import { teamById } from "@/lib/employees/types";

const HEADER_ROW = Array.from(SHEET_HEADER);

function parseServiceAccount(serviceAccountJson: string): {
  client_email: string;
  private_key: string;
} {
  const credentials = JSON.parse(serviceAccountJson) as {
    client_email: string;
    private_key: string;
  };
  if (credentials.private_key?.includes("\\n")) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }
  return credentials;
}

async function getSheetsClient() {
  const { spreadsheetId, tabName, serviceAccountJson } = getGoogleSheetsConfig();
  const credentials = parseServiceAccount(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId,
    tabName,
  };
}

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
  const { sheets, spreadsheetId, tabName } = await getSheetsClient();
  const newDateRows = await buildDataRowsForDate(date, teamIds);
  const teamNames = teamIds
    .map((teamId) => teamById(teamId)?.name)
    .filter((name): name is string => Boolean(name));
  const range = `${tabName}!A:J`;

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

/**
 * Rebuild the sheet from every date that already has saved daily rows.
 * One clear + write so the sheet matches the app without saving each day again.
 */
export async function pushAllSavedSchedulesToSheets(): Promise<{
  dateCount: number;
  rowCount: number;
}> {
  const { sheets, spreadsheetId, tabName } = await getSheetsClient();
  const dates = await listSavedScheduleDates();
  const dataRows: string[][] = [];

  for (const date of dates) {
    const entries = await listDailyEntriesForDate(date);
    const teamIds = [...new Set(entries.map((entry) => entry.teamId))];
    if (teamIds.length === 0) continue;
    dataRows.push(...(await buildDataRowsForDate(date, teamIds)));
  }

  const merged = [HEADER_ROW, ...sortSheetDataRows(dataRows)];
  const range = `${tabName}!A:J`;

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

  return { dateCount: dates.length, rowCount: dataRows.length };
}
