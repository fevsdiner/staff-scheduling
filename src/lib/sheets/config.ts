export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  );
}

export function getGoogleSheetsConfig(): {
  spreadsheetId: string;
  tabName: string;
  serviceAccountJson: string;
} {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!spreadsheetId || !serviceAccountJson) {
    throw new Error(
      "Google Sheets is not configured. Set GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON.",
    );
  }

  return {
    spreadsheetId,
    tabName: process.env.GOOGLE_SHEETS_TAB_NAME ?? "Sheet1",
    serviceAccountJson,
  };
}
