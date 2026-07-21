import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { listEmployees } from "@/lib/employees/demo-store";
import { TEAM_OPTIONS } from "@/lib/employees/types";
import { WEEKLY_TEMPLATE_BY_EMPLOYEE } from "@/lib/templates/seed-schedule";
import type {
  TemplateSegment,
  TemplateShift,
  TemplateVersion,
} from "@/lib/templates/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "templates.json");

interface TemplateStore {
  versions: TemplateVersion[];
}

function segmentsForEmployeeDay(name: string, dayOfWeek: number): TemplateSegment[] {
  const lookupName =
    name === "Karl Christian Yancha" ? "Jay Francis Actub" : name;
  return (
    WEEKLY_TEMPLATE_BY_EMPLOYEE[lookupName]?.[dayOfWeek]?.map((segment) => ({
      ...segment,
    })) ?? []
  );
}

function buildSeedVersion(teamId: string, label: string): TemplateVersion {
  const employees = listEmployees().filter(
    (employee) =>
      employee.teamId === teamId &&
      employee.active &&
      employee.employmentType === "regular",
  );
  const shifts: TemplateShift[] = [];

  for (const employee of employees) {
    for (let day = 0; day <= 6; day += 1) {
      const segments = segmentsForEmployeeDay(employee.name, day);
      shifts.push({
        id: randomUUID(),
        employeeId: employee.id,
        dayOfWeek: day,
        isOff: segments.length === 0,
        segments,
      });
    }
  }

  return {
    id: randomUUID(),
    teamId,
    versionLabel: label,
    effectiveFrom: "2026-01-01",
    notes: "Initial weekly template from spreadsheet",
    createdAt: new Date().toISOString(),
    shifts,
  };
}

function ensureStore(): TemplateStore {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!existsSync(STORE_PATH)) {
    const versions = TEAM_OPTIONS.map((team) => buildSeedVersion(team.id, "v1"));
    const store = { versions };
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
    return store;
  }

  return JSON.parse(readFileSync(STORE_PATH, "utf8")) as TemplateStore;
}

function saveStore(store: TemplateStore): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function listTemplateVersions(teamId: string): TemplateVersion[] {
  return ensureStore()
    .versions.filter((version) => version.teamId === teamId)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}

export function getTemplateVersion(versionId: string): TemplateVersion | null {
  return ensureStore().versions.find((version) => version.id === versionId) ?? null;
}

export function getLatestTemplateVersion(teamId: string): TemplateVersion | null {
  return listTemplateVersions(teamId)[0] ?? null;
}

/** Active template for a calendar date: latest version with effectiveFrom <= date. */
export function getTemplateVersionForDate(
  teamId: string,
  date: string,
): TemplateVersion | null {
  const versions = listTemplateVersions(teamId)
    .filter((version) => version.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return versions[0] ?? null;
}

export function getShiftsForDay(
  version: TemplateVersion,
  dayOfWeek: number,
): TemplateShift[] {
  return version.shifts.filter((shift) => shift.dayOfWeek === dayOfWeek);
}

export function createTemplateVersion(input: {
  teamId: string;
  versionLabel: string;
  effectiveFrom: string;
  notes?: string;
  copyFromVersionId?: string;
}): TemplateVersion {
  const store = ensureStore();
  const label = input.versionLabel.trim();
  if (!label) throw new Error("Version label is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) {
    throw new Error("Effective date must be YYYY-MM-DD.");
  }

  let shifts: TemplateShift[] = [];
  if (input.copyFromVersionId) {
    const source = store.versions.find(
      (version) => version.id === input.copyFromVersionId,
    );
    if (!source || source.teamId !== input.teamId) {
      throw new Error("Source version not found for this team.");
    }
    shifts = source.shifts.map((shift) => ({
      ...shift,
      id: randomUUID(),
      segments: shift.segments.map((segment) => ({ ...segment })),
    }));
  } else {
    shifts = buildSeedVersion(input.teamId, label).shifts;
  }

  // Ensure every active employee has a row for each day
  const activeEmployees = listEmployees().filter(
    (employee) =>
      employee.teamId === input.teamId &&
      employee.active &&
      employee.employmentType === "regular",
  );
  for (const employee of activeEmployees) {
    for (let day = 0; day <= 6; day += 1) {
      const exists = shifts.some(
        (shift) => shift.employeeId === employee.id && shift.dayOfWeek === day,
      );
      if (!exists) {
        shifts.push({
          id: randomUUID(),
          employeeId: employee.id,
          dayOfWeek: day,
          isOff: true,
          segments: [],
        });
      }
    }
  }

  const version: TemplateVersion = {
    id: randomUUID(),
    teamId: input.teamId,
    versionLabel: label,
    effectiveFrom: input.effectiveFrom,
    notes: input.notes?.trim() ?? "",
    createdAt: new Date().toISOString(),
    shifts,
  };

  store.versions.push(version);
  saveStore(store);
  return version;
}

export function saveDayShifts(input: {
  versionId: string;
  dayOfWeek: number;
  shifts: Array<{
    employeeId: string;
    isOff: boolean;
    segments: TemplateSegment[];
  }>;
}): TemplateVersion {
  const store = ensureStore();
  const index = store.versions.findIndex(
    (version) => version.id === input.versionId,
  );
  if (index < 0) throw new Error("Template version not found.");

  const version = store.versions[index];
  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    throw new Error("Invalid day of week.");
  }

  const otherShifts = version.shifts.filter(
    (shift) => shift.dayOfWeek !== input.dayOfWeek,
  );
  const dayShifts: TemplateShift[] = input.shifts.map((shift) => {
    const segments = shift.isOff
      ? []
      : shift.segments
          .filter((segment) => segment.timeIn && segment.timeOut)
          .slice(0, 3)
          .map((segment) => ({
            timeIn: segment.timeIn,
            timeOut: segment.timeOut,
          }));

    if (!shift.isOff && segments.length === 0) {
      throw new Error("Working shifts need at least one time segment.");
    }

    for (const segment of segments) {
      if (segment.timeIn >= segment.timeOut) {
        throw new Error("Time-in must be before time-out.");
      }
    }

    return {
      id: randomUUID(),
      employeeId: shift.employeeId,
      dayOfWeek: input.dayOfWeek,
      isOff: shift.isOff,
      segments,
    };
  });

  const updated: TemplateVersion = {
    ...version,
    shifts: [...otherShifts, ...dayShifts],
  };
  store.versions[index] = updated;
  saveStore(store);
  return updated;
}
