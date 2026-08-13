import { randomUUID } from "crypto";

import { getEmployeeById, listEmployees } from "@/lib/employees/store";
import { createSupabaseClient } from "@/lib/supabase/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildSeedVersion } from "@/lib/templates/demo-store";
import { assertValidShiftSegments } from "@/lib/schedule/validate-segments";
import type {
  TemplateSegment,
  TemplateShift,
  TemplateVersion,
} from "@/lib/templates/types";

const VERSION_SELECT = `
  id,
  team_id,
  version_label,
  effective_from,
  notes,
  created_at,
  shifts:weekly_template_shifts(
    id,
    employee_id,
    day_of_week,
    is_off,
    segments:weekly_template_segments(sort_order, time_in, time_out)
  )
`;

interface VersionRow {
  id: string;
  team_id: string;
  version_label: string;
  effective_from: string;
  notes: string | null;
  created_at: string;
  shifts: Array<{
    id: string;
    employee_id: string;
    day_of_week: number;
    is_off: boolean;
    segments: Array<{ sort_order: number; time_in: string; time_out: string }> | null;
  }> | null;
}

function toDbTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

function mapVersion(row: VersionRow): TemplateVersion {
  const shifts: TemplateShift[] = (row.shifts ?? []).map((shift) => ({
    id: shift.id,
    employeeId: shift.employee_id,
    dayOfWeek: shift.day_of_week,
    isOff: shift.is_off,
    segments: (shift.segments ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((segment) => ({
        timeIn: segment.time_in.slice(0, 5),
        timeOut: segment.time_out.slice(0, 5),
      })),
  }));

  return {
    id: row.id,
    teamId: row.team_id,
    versionLabel: row.version_label,
    effectiveFrom: row.effective_from,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    shifts,
  };
}

async function fetchVersionsForTeam(teamId: string): Promise<TemplateVersion[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_template_versions")
    .select(VERSION_SELECT)
    .eq("team_id", teamId)
    .order("effective_from", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapVersion(row as VersionRow));
}

async function insertVersion(version: TemplateVersion): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { error: versionError } = await supabase.from("weekly_template_versions").insert({
    id: version.id,
    team_id: version.teamId,
    version_label: version.versionLabel,
    effective_from: version.effectiveFrom,
    notes: version.notes,
    created_at: version.createdAt,
  });

  if (versionError) throw new Error(versionError.message);

  for (const shift of version.shifts) {
    const { error: shiftError } = await supabase.from("weekly_template_shifts").insert({
      id: shift.id,
      version_id: version.id,
      employee_id: shift.employeeId,
      day_of_week: shift.dayOfWeek,
      is_off: shift.isOff,
    });

    if (shiftError) throw new Error(shiftError.message);

    if (!shift.isOff && shift.segments.length > 0) {
      const { error: segmentError } = await supabase
        .from("weekly_template_segments")
        .insert(
          shift.segments.map((segment, index) => ({
            template_shift_id: shift.id,
            sort_order: index + 1,
            time_in: toDbTime(segment.timeIn),
            time_out: toDbTime(segment.timeOut),
          })),
        );

      if (segmentError) throw new Error(segmentError.message);
    }
  }
}

async function seedDefaultForTeam(teamId: string): Promise<void> {
  await insertVersion(buildSeedVersion(teamId, "v1"));
}

export async function listTemplateVersions(teamId: string): Promise<TemplateVersion[]> {
  let versions = await fetchVersionsForTeam(teamId);
  if (versions.length === 0) {
    await seedDefaultForTeam(teamId);
    versions = await fetchVersionsForTeam(teamId);
  }
  return versions;
}

export async function getTemplateVersion(versionId: string): Promise<TemplateVersion | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_template_versions")
    .select(VERSION_SELECT)
    .eq("id", versionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapVersion(data as VersionRow) : null;
}

export async function getTemplateVersionForDate(
  teamId: string,
  date: string,
): Promise<TemplateVersion | null> {
  const versions = (await listTemplateVersions(teamId))
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

export async function createTemplateVersion(input: {
  teamId: string;
  versionLabel: string;
  effectiveFrom: string;
  notes?: string;
  copyFromVersionId?: string;
}): Promise<TemplateVersion> {
  const label = input.versionLabel.trim();
  if (!label) throw new Error("Version label is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) {
    throw new Error("Effective date must be YYYY-MM-DD.");
  }

  let shifts: TemplateShift[] = [];
  if (input.copyFromVersionId) {
    const source = await getTemplateVersion(input.copyFromVersionId);
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

  const activeEmployees = (await listEmployees()).filter(
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

  await insertVersion(version);
  return version;
}

export async function saveDayShifts(input: {
  versionId: string;
  dayOfWeek: number;
  shifts: Array<{
    employeeId: string;
    isOff: boolean;
    segments: TemplateSegment[];
  }>;
}): Promise<TemplateVersion> {
  const version = await getTemplateVersion(input.versionId);
  if (!version) throw new Error("Template version not found.");
  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    throw new Error("Invalid day of week.");
  }

  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("weekly_template_shifts")
    .delete()
    .eq("version_id", input.versionId)
    .eq("day_of_week", input.dayOfWeek);

  if (deleteError) throw new Error(deleteError.message);

  const dayShifts: TemplateShift[] = [];
  for (const shift of input.shifts) {
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

    const employee = await getEmployeeById(shift.employeeId);
    if (!shift.isOff) {
      assertValidShiftSegments(segments, employee?.name ?? "Employee");
    }

    dayShifts.push({
      id: randomUUID(),
      employeeId: shift.employeeId,
      dayOfWeek: input.dayOfWeek,
      isOff: shift.isOff,
      segments,
    });
  }

  for (const shift of dayShifts) {
    const { error: shiftError } = await supabase.from("weekly_template_shifts").insert({
      id: shift.id,
      version_id: input.versionId,
      employee_id: shift.employeeId,
      day_of_week: shift.dayOfWeek,
      is_off: shift.isOff,
    });

    if (shiftError) throw new Error(shiftError.message);

    if (!shift.isOff && shift.segments.length > 0) {
      const { error: segmentError } = await supabase
        .from("weekly_template_segments")
        .insert(
          shift.segments.map((segment, index) => ({
            template_shift_id: shift.id,
            sort_order: index + 1,
            time_in: toDbTime(segment.timeIn),
            time_out: toDbTime(segment.timeOut),
          })),
        );

      if (segmentError) throw new Error(segmentError.message);
    }
  }

  const otherShifts = version.shifts.filter(
    (shift) => shift.dayOfWeek !== input.dayOfWeek,
  );

  return {
    ...version,
    shifts: [...otherShifts, ...dayShifts],
  };
}
