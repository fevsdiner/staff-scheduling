import { randomUUID } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";

import { stableDailyEntryId } from "@/lib/daily/entry-id";

import { canUseFileDataStore } from "@/lib/env";
import { getEmployeeById, listEmployees } from "@/lib/employees/demo-store";
import { ensureLocalDataDir, LOCAL_DATA_DIR } from "@/lib/local-data-store";
import { TEAM_OPTIONS, teamById } from "@/lib/employees/types";
import { dayOfWeekFromDateString } from "@/lib/schedule/datetime";
import {
  getShiftsForDay,
  getTemplateVersionForDate,
} from "@/lib/templates/demo-store";
import type { DailyEntry, DailySegment, DailyStore } from "@/lib/daily/types";
import { sortDailyEntries } from "@/lib/daily/sort";
import { assertValidShiftSegments } from "@/lib/schedule/validate-segments";

const STORE_PATH = `${LOCAL_DATA_DIR}/daily-schedules.json`;

let memoryStore: DailyStore | null = null;

function emptyStore(): DailyStore {
  return { entries: [] };
}

function ensureStore(): DailyStore {
  if (!canUseFileDataStore()) {
    memoryStore ??= emptyStore();
    return memoryStore;
  }

  if (!ensureLocalDataDir()) {
    memoryStore ??= emptyStore();
    return memoryStore;
  }

  if (!existsSync(STORE_PATH)) {
    const store = emptyStore();
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
    return store;
  }
  return JSON.parse(readFileSync(STORE_PATH, "utf8")) as DailyStore;
}

function saveStore(store: DailyStore): void {
  if (!canUseFileDataStore()) {
    memoryStore = store;
    return;
  }

  if (!ensureLocalDataDir()) {
    memoryStore = store;
    return;
  }
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

/** Returns daily entries for team+date, generating from template if missing. */
export function generateFromTemplate(teamId: string, date: string): DailyEntry[] {
  const team = teamById(teamId);
  if (!team) throw new Error("Invalid team.");

  const template = getTemplateVersionForDate(teamId, date);
  const dayOfWeek = dayOfWeekFromDateString(date);
  const employees = listEmployees().filter(
    (employee) =>
      employee.teamId === teamId &&
      employee.active &&
      employee.employmentType === "regular",
  );
  const now = new Date().toISOString();

  if (!template) {
    return employees.map((employee) => ({
      id: stableDailyEntryId(teamId, date, employee.id),
      scheduleDate: date,
      teamId,
      employeeId: employee.id,
      employeeName: employee.name,
      partTimeName: null,
      isPartTime: false,
      isOff: true,
      isSwapOff: false,
      source: "template" as const,
      segments: [],
      updatedAt: now,
    }));
  }

  const shifts = getShiftsForDay(template, dayOfWeek);
  return employees.map((employee) => {
    const shift = shifts.find((entry) => entry.employeeId === employee.id);
    return {
      id: stableDailyEntryId(teamId, date, employee.id),
      scheduleDate: date,
      teamId,
      employeeId: employee.id,
      employeeName: employee.name,
      partTimeName: null,
      isPartTime: false,
      isOff: shift?.isOff ?? true,
      isSwapOff: false,
      source: "template" as const,
      segments: shift && !shift.isOff ? shift.segments.map((s) => ({ ...s })) : [],
      updatedAt: now,
    };
  });
}

function withCurrentEmployeeName(entry: DailyEntry): DailyEntry {
  const normalized: DailyEntry = {
    ...entry,
    isSwapOff: entry.isSwapOff ?? false,
  };
  if (!normalized.employeeId) return normalized;
  const employee = getEmployeeById(normalized.employeeId);
  if (!employee) return normalized;
  return { ...normalized, employeeName: employee.name };
}

/** Returns daily entries for team+date, generating from template if missing. */
export function getOrCreateDailyEntries(
  teamId: string,
  date: string,
): DailyEntry[] {
  const store = ensureStore();
  const existing = store.entries.filter(
    (entry) => entry.scheduleDate === date && entry.teamId === teamId,
  );
  if (existing.length > 0) {
    return sortDailyEntries(existing.map(withCurrentEmployeeName));
  }

  const generated = generateFromTemplate(teamId, date);
  store.entries.push(...generated);
  saveStore(store);
  return sortDailyEntries(generated);
}

export function listDailyEntriesForDate(date: string, teamId?: string): DailyEntry[] {
  const store = ensureStore();
  return sortDailyEntries(
    store.entries
      .filter((entry) => {
        if (entry.scheduleDate !== date) return false;
        if (teamId && entry.teamId !== teamId) return false;
        return true;
      })
      .map(withCurrentEmployeeName),
  );
}

export function patchDailyScheduleEmployeeName(
  employeeId: string,
  newName: string,
): string[] {
  const store = ensureStore();
  const dates = new Set<string>();
  let changed = false;

  for (const entry of store.entries) {
    if (entry.employeeId === employeeId) {
      entry.employeeName = newName;
      dates.add(entry.scheduleDate);
      changed = true;
    }
  }

  if (changed) {
    saveStore(store);
  }

  return [...dates].sort();
}

/** Ensure all teams have generated rows for a date (for public view). */
export function ensureAllTeamsForDate(date: string): DailyEntry[] {
  for (const team of TEAM_OPTIONS) {
    getOrCreateDailyEntries(team.id, date);
  }
  return listDailyEntriesForDate(date);
}

export function saveDailyEntries(input: {
  teamId: string;
  date: string;
  entries: Array<{
    id?: string;
    employeeId: string | null;
    employeeName: string;
    partTimeName: string | null;
    isPartTime: boolean;
    isOff: boolean;
    isSwapOff?: boolean;
    segments: DailySegment[];
    source?: "template" | "manual";
  }>;
}): DailyEntry[] {
  const store = ensureStore();
  const now = new Date().toISOString();
  const kept = store.entries.filter(
    (entry) => !(entry.scheduleDate === input.date && entry.teamId === input.teamId),
  );

  const saved: DailyEntry[] = input.entries.map((entry) => {
    const isOff = entry.isOff;
    const isSwapOff = isOff ? false : Boolean(entry.isSwapOff);
    const segments = isOff
      ? []
      : entry.segments
          .filter((segment) => segment.timeIn && segment.timeOut)
          .slice(0, 3);

    if (!isOff && segments.length === 0) {
      throw new Error(`${entry.employeeName}: working shifts need a time segment.`);
    }
    if (!isOff) {
      assertValidShiftSegments(segments, entry.employeeName);
    }

    return {
      id: entry.id ?? randomUUID(),
      scheduleDate: input.date,
      teamId: input.teamId,
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      partTimeName: entry.partTimeName,
      isPartTime: entry.isPartTime,
      isOff,
      isSwapOff,
      source: entry.source ?? "manual",
      segments,
      updatedAt: now,
    };
  });

  store.entries = [...kept, ...saved];
  saveStore(store);
  return sortDailyEntries(saved);
}

export function resetDailyToTemplate(teamId: string, date: string): DailyEntry[] {
  const store = ensureStore();
  store.entries = store.entries.filter(
    (entry) => !(entry.scheduleDate === date && entry.teamId === teamId),
  );
  saveStore(store);
  return getOrCreateDailyEntries(teamId, date);
}

export function addPartTimeEntry(input: {
  teamId: string;
  date: string;
  employeeId: string;
}): DailyEntry {
  getOrCreateDailyEntries(input.teamId, input.date);

  const employee = getEmployeeById(input.employeeId);
  if (!employee || !employee.active) {
    throw new Error("Employee not found.");
  }
  if (employee.employmentType !== "part_time") {
    throw new Error("Choose a part-time employee from the roster.");
  }
  if (employee.teamId !== input.teamId) {
    throw new Error("Employee is not on this team.");
  }

  const store = ensureStore();
  const alreadyScheduled = store.entries.some(
    (entry) =>
      entry.scheduleDate === input.date &&
      entry.teamId === input.teamId &&
      entry.employeeId === employee.id,
  );
  if (alreadyScheduled) {
    throw new Error(`${employee.name} is already on this day's schedule.`);
  }

  const entry: DailyEntry = {
    id: randomUUID(),
    scheduleDate: input.date,
    teamId: input.teamId,
    employeeId: employee.id,
    employeeName: employee.name,
    partTimeName: null,
    isPartTime: true,
    isOff: false,
    isSwapOff: false,
    source: "manual",
    segments: [{ timeIn: "09:00", timeOut: "17:00" }],
    updatedAt: new Date().toISOString(),
  };
  store.entries.push(entry);
  saveStore(store);
  return entry;
}

export function removeDailyEntry(entryId: string): void {
  const store = ensureStore();
  store.entries = store.entries.filter((entry) => entry.id !== entryId);
  saveStore(store);
}
