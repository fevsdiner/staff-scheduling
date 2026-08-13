/**
 * Rename an employee in Supabase and propagate to schedules + Google Sheets.
 *
 * Usage:
 *   node scripts/rename-employee.mjs <employee-id> "New Name"
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { google } from "googleapis";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const employeeId = process.argv[2];
const newName = process.argv[3]?.trim();

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

if (!employeeId || !newName) {
  console.error('Usage: node scripts/rename-employee.mjs <employee-id> "New Name"');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
const tabName = process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || "Sheet1";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: before, error: fetchError } = await supabase
  .from("employees")
  .select("id,name")
  .eq("id", employeeId)
  .single();

if (fetchError || !before) {
  console.error("Employee not found:", fetchError?.message);
  process.exit(1);
}

console.log(`Renaming "${before.name}" → "${newName}"`);

const { error: updateError } = await supabase
  .from("employees")
  .update({ name: newName })
  .eq("id", employeeId);

if (updateError) {
  console.error("Supabase update failed:", updateError.message);
  process.exit(1);
}

const employeesPath = resolve(root, ".data/employees.json");
if (existsSync(employeesPath)) {
  const employees = JSON.parse(readFileSync(employeesPath, "utf8"));
  for (const employee of employees) {
    if (employee.id === employeeId) employee.name = newName;
  }
  writeFileSync(employeesPath, JSON.stringify(employees, null, 2), "utf8");
  console.log("  ✓ local employees.json");
}

const dailyPath = resolve(root, ".data/daily-schedules.json");
const dates = new Set();
if (existsSync(dailyPath)) {
  const store = JSON.parse(readFileSync(dailyPath, "utf8"));
  for (const entry of store.entries ?? []) {
    if (entry.employeeId === employeeId) {
      entry.employeeName = newName;
      dates.add(entry.scheduleDate);
    }
  }
  writeFileSync(dailyPath, JSON.stringify(store, null, 2), "utf8");
  console.log(`  ✓ local daily-schedules.json (${dates.size} dates)`);
}

const { data: scheduleRows } = await supabase
  .from("daily_schedules")
  .select("schedule_date")
  .eq("employee_id", employeeId);

for (const row of scheduleRows ?? []) {
  dates.add(row.schedule_date);
}

if (spreadsheetId && serviceAccountJson && dates.size > 0) {
  const credentials = JSON.parse(serviceAccountJson);
  if (credentials.private_key?.includes("\\n")) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const TEAM_NAMES = { "11111111-1111-1111-1111-111111111101": "Kitchen", "11111111-1111-1111-1111-111111111102": "Dining", "11111111-1111-1111-1111-111111111103": "OJT" };
  const HEADER = ["Date", "Day", "Team", "Employee Name", "Type", "TIME-IN (1)", "TIME-OUT (1)", "TIME-IN (2)", "TIME-OUT (2)", "Swap Off"];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function dayName(date) {
    const [y, m, d] = date.split("-").map(Number);
    return DAY_NAMES[new Date(y, m - 1, d).getDay()];
  }

  async function rowsForDate(date) {
    const { data } = await supabase
      .from("daily_schedules")
      .select(`schedule_date, team_id, is_part_time, is_off, is_swap_off, part_time_name, employee:employees(name), segments:daily_schedule_segments(sort_order, time_in, time_out)`)
      .eq("schedule_date", date);
    return (data ?? []).map((row) => {
      const employee = Array.isArray(row.employee) ? row.employee[0] : row.employee;
      const name = row.is_part_time && row.part_time_name ? row.part_time_name : employee?.name ?? "Unknown";
      const type = row.is_part_time ? "Part-Time" : "Regular";
      const swapOff = row.is_swap_off ? "/" : "";
      if (row.is_off) return [date, dayName(date), TEAM_NAMES[row.team_id] ?? "", name, type, "-", "-", "-", "-", swapOff];
      const segments = (row.segments ?? []).sort((a, b) => a.sort_order - b.sort_order);
      return [date, dayName(date), TEAM_NAMES[row.team_id] ?? "", name, type, segments[0]?.time_in?.slice(0, 5) ?? "-", segments[0]?.time_out?.slice(0, 5) ?? "-", segments[1]?.time_in?.slice(0, 5) ?? "-", segments[1]?.time_out?.slice(0, 5) ?? "-", swapOff];
    });
  }

  const sortedDates = [...dates].sort();
  const range = `${tabName}!A:J`;
  const existingResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  let dataRows = (existingResponse.data.values ?? []).slice();
  if (dataRows[0]?.[0] === HEADER[0]) dataRows = dataRows.slice(1);
  const updating = new Set(sortedDates);
  dataRows = dataRows.filter((row) => !updating.has(row[0] ?? ""));
  for (const date of sortedDates) {
    dataRows.push(...(await rowsForDate(date)));
  }
  dataRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[2]).localeCompare(String(b[2])) || String(a[3]).localeCompare(String(b[3])));
  await sheets.spreadsheets.values.clear({ spreadsheetId, range });
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `${tabName}!A1`, valueInputOption: "USER_ENTERED", requestBody: { values: [HEADER, ...dataRows] } });
  console.log(`  ✓ Google Sheets (${sortedDates.length} dates)`);
}

console.log("Done.");
