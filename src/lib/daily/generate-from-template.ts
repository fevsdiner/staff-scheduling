import { stableDailyEntryId } from "@/lib/daily/entry-id";
import { dayOfWeekFromDateString } from "@/lib/schedule/datetime";
import { listEmployees } from "@/lib/employees/demo-store";
import { teamById } from "@/lib/employees/types";
import {
  getShiftsForDay,
  getTemplateVersionForDate,
} from "@/lib/templates/store";
import type { DailyEntry } from "@/lib/daily/types";

/** Build daily rows from the active weekly template (Supabase or local store). */
export async function generateDailyEntriesFromTemplate(
  teamId: string,
  date: string,
): Promise<DailyEntry[]> {
  const team = teamById(teamId);
  if (!team) throw new Error("Invalid team.");

  const template = await getTemplateVersionForDate(teamId, date);
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
      source: "template" as const,
      segments: shift && !shift.isOff ? shift.segments.map((segment) => ({ ...segment })) : [],
      updatedAt: now,
    };
  });
}
