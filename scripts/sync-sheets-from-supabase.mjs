/**
 * Push saved Supabase schedules → Google Sheets so the sheet matches Vercel.
 *
 * Usage:
 *   node scripts/sync-sheets-from-supabase.mjs
 *   node scripts/sync-sheets-from-supabase.mjs 2026-07-20 2026-07-26
 */

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");

const TEAM_OPTIONS = [
  { id: "11111111-1111-1111-1111-111111111101", name: "Kitchen", order: 0 },
  { id: "11111111-1111-1111-1111-111111111102", name: "Dining", order: 1 },
  { id: "11111111-1111-1111-1111-111111111103", name: "OJT", order: 2 },
];

const HEADER = [
  "Date",
  "Day",
  "Team",
  "Employee Name",
  "Type",
  "TIME-IN (1)",
  "TIME-OUT (1)",
  "TIME-IN (2)",
  "TIME-OUT (2)",
  "Swap Off",
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(resolve(root, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
const tabName = process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || "Sheet1";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}
if (!spreadsheetId || !serviceAccountJson) {
  console.error("Missing Google Sheets env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const credentials = JSON.parse(serviceAccountJson);
if (credentials.private_key?.includes("\\n")) {
  credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
}
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

function dayName(date) {
  const [y, m, d] = date.split("-").map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

function teamName(teamId) {
  return TEAM_OPTIONS.find((team) => team.id === teamId)?.name ?? "";
}

function entryToRow(date, entry, employeeName) {
  const type = entry.is_part_time ? "Part-Time" : "Regular";
  const swapOff = entry.is_swap_off ? "/" : "";
  if (entry.is_off) {
    return [date, dayName(date), teamName(entry.team_id), employeeName, type, "-", "-", "-", "-", swapOff];
  }
  const segments = (entry.segments ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const seg0 = segments[0];
  const seg1 = segments[1];
  return [
    date,
    dayName(date),
    teamName(entry.team_id),
    employeeName,
    type,
    seg0?.time_in?.slice(0, 5) ?? "-",
    seg0?.time_out?.slice(0, 5) ?? "-",
    seg1?.time_in?.slice(0, 5) ?? "-",
    seg1?.time_out?.slice(0, 5) ?? "-",
    swapOff,
  ];
}

function sortRows(rows) {
  const teamOrder = new Map(TEAM_OPTIONS.map((team) => [team.name, team.order]));
  return [...rows].sort((a, b) => {
    const dateCompare = String(a[0]).localeCompare(String(b[0]));
    if (dateCompare !== 0) return dateCompare;
    const teamA = teamOrder.get(a[2] ?? "") ?? 99;
    const teamB = teamOrder.get(b[2] ?? "") ?? 99;
    if (teamA !== teamB) return teamA - teamB;
    return String(a[3]).localeCompare(String(b[3]));
  });
}

async function fetchRowsForDate(date) {
  const { data, error } = await supabase
    .from("daily_schedules")
    .select(
      `
      id,
      schedule_date,
      team_id,
      employee_id,
      part_time_name,
      is_part_time,
      is_off,
      is_swap_off,
      employee:employees(name),
      segments:daily_schedule_segments(sort_order, time_in, time_out)
    `,
    )
    .eq("schedule_date", date);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const employee = Array.isArray(row.employee) ? row.employee[0] : row.employee;
    const name =
      row.is_part_time && row.part_time_name
        ? row.part_time_name
        : employee?.name ?? "Unknown";
    return entryToRow(date, { ...row, segments: row.segments ?? [] }, name);
  });
}

async function getDatesToSync() {
  const argDates = process.argv.slice(2).filter((arg) => /^\d{4}-\d{2}-\d{2}$/.test(arg));
  if (argDates.length >= 2) {
    const start = argDates[0];
    const end = argDates[argDates.length - 1];
    const { data, error } = await supabase
      .from("daily_schedules")
      .select("schedule_date")
      .gte("schedule_date", start)
      .lte("schedule_date", end);
    if (error) throw new Error(error.message);
    return [...new Set((data ?? []).map((row) => row.schedule_date))].sort();
  }

  const { data, error } = await supabase.from("daily_schedules").select("schedule_date");
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((row) => row.schedule_date))].sort();
}

const dates = await getDatesToSync();
if (dates.length === 0) {
  console.error("No saved schedule dates found in Supabase.");
  process.exit(1);
}

console.log(`Syncing ${dates.length} date(s) from Supabase → Google Sheets…`);

const range = `${tabName}!A:J`;
const existingResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range });
let dataRows = (existingResponse.data.values ?? []).slice();
if (dataRows.length > 0 && dataRows[0]?.[0] === HEADER[0]) {
  dataRows = dataRows.slice(1);
}

const datesBeingUpdated = new Set(dates);
dataRows = dataRows.filter((row) => !datesBeingUpdated.has(row[0] ?? ""));

for (const date of dates) {
  const newRows = await fetchRowsForDate(date);
  dataRows.push(...newRows);
  console.log(`  ✓ ${date} (${newRows.length} rows)`);
}

const merged = [HEADER, ...sortRows(dataRows)];

await sheets.spreadsheets.values.clear({ spreadsheetId, range });
await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: `${tabName}!A1`,
  valueInputOption: "USER_ENTERED",
  requestBody: { values: merged },
});

console.log(`Done. Sheet now has ${merged.length - 1} data rows.`);
