/**
 * One-time sync: .data/daily-schedules.json → Supabase daily_schedules.
 *
 * Use when schedules were saved locally (file store + Google Sheets) but
 * production Vercel reads from Supabase and is missing rows.
 *
 * Requires in .env.local (or env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/import-local-daily-to-supabase.mjs
 *   node scripts/import-local-daily-to-supabase.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const storePath = resolve(root, ".data/daily-schedules.json");
const dryRun = process.argv.includes("--dry-run");

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
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(root, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

if (!existsSync(storePath)) {
  console.error(`No local store at ${storePath}`);
  process.exit(1);
}

const { entries } = JSON.parse(readFileSync(storePath, "utf8"));
if (!Array.isArray(entries) || entries.length === 0) {
  console.error("Local daily-schedules.json has no entries.");
  process.exit(1);
}

/** @type {Map<string, typeof entries>} */
const groups = new Map();
for (const entry of entries) {
  const key = `${entry.teamId}|${entry.scheduleDate}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(entry);
}

function toDbTime(time) {
  return time.length === 5 ? `${time}:00` : time;
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(
  dryRun ? "DRY RUN — no writes" : "Importing local daily schedules to Supabase…",
);
console.log(`  ${entries.length} entries in ${groups.size} team/day groups`);

let importedGroups = 0;
let importedEntries = 0;

for (const [key, groupEntries] of [...groups.entries()].sort()) {
  const [teamId, date] = key.split("|");

  if (dryRun) {
    console.log(`  would import ${date} team ${teamId.slice(0, 8)}… (${groupEntries.length} rows)`);
    importedGroups += 1;
    importedEntries += groupEntries.length;
    continue;
  }

  const { error: deleteError } = await supabase
    .from("daily_schedules")
    .delete()
    .eq("team_id", teamId)
    .eq("schedule_date", date);

  if (deleteError) {
    console.error(`Delete failed for ${date} ${teamId}:`, deleteError.message);
    process.exit(1);
  }

  for (const entry of groupEntries) {
    const { error: scheduleError } = await supabase.from("daily_schedules").insert({
      id: entry.id,
      schedule_date: entry.scheduleDate,
      team_id: entry.teamId,
      employee_id: entry.employeeId,
      part_time_name: entry.partTimeName,
      is_part_time: entry.isPartTime,
      is_off: entry.isOff,
      is_swap_off: Boolean(entry.isSwapOff),
      source: entry.source ?? "manual",
      updated_at: entry.updatedAt ?? new Date().toISOString(),
    });

    if (scheduleError) {
      console.error(
        `Insert failed ${entry.scheduleDate} ${entry.employeeName}:`,
        scheduleError.message,
      );
      process.exit(1);
    }

    if (!entry.isOff && entry.segments?.length > 0) {
      const { error: segmentError } = await supabase.from("daily_schedule_segments").insert(
        entry.segments.map((segment, index) => ({
          daily_schedule_id: entry.id,
          sort_order: index + 1,
          time_in: toDbTime(segment.timeIn),
          time_out: toDbTime(segment.timeOut),
        })),
      );

      if (segmentError) {
        console.error(`Segments failed ${entry.employeeName}:`, segmentError.message);
        process.exit(1);
      }
    }

    importedEntries += 1;
  }

  importedGroups += 1;
  console.log(`  ✓ ${date} team ${teamId.slice(0, 8)}… (${groupEntries.length} rows)`);
}

console.log(`Done: ${importedGroups} groups, ${importedEntries} entries.`);
