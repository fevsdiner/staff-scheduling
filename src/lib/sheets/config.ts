import { readEnv } from "@/lib/env";

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    readEnv("GOOGLE_SHEETS_SPREADSHEET_ID") &&
      readEnv("GOOGLE_SERVICE_ACCOUNT_JSON"),
  );
}

export function getGoogleSheetsConfig(): {
  spreadsheetId: string;
  tabName: string;
  serviceAccountJson: string;
} {
  const spreadsheetId = readEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
  const serviceAccountJson = readEnv("GOOGLE_SERVICE_ACCOUNT_JSON");

  if (!spreadsheetId || !serviceAccountJson) {
    throw new Error(
      "Google Sheets is not configured. Set GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON.",
    );
  }

  return {
    spreadsheetId,
    tabName: readEnv("GOOGLE_SHEETS_TAB_NAME") ?? "Sheet1",
    serviceAccountJson,
  };
}
