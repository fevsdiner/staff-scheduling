"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import type { AuthUser } from "@/lib/auth/types";
import { getEmployeeById } from "@/lib/employees/demo-store";
import {
  addPartTimeEntry,
  getOrCreateDailyEntries,
  removeDailyEntry,
  resetDailyToTemplate,
  saveDailyEntries,
} from "@/lib/daily/store";
import type { DailySegment } from "@/lib/daily/types";
import { teamById, teamBySlug, type TeamSlug } from "@/lib/employees/types";
import { tryPushScheduleToSheets } from "@/lib/sheets/actions";

export type DailyActionState = {
  error?: string;
  success?: string;
  sheetsNotice?: {
    type: "success" | "error";
    message: string;
  };
};

function assertTeamAccess(user: AuthUser, teamId: string): void {
  const team = teamById(teamId);
  if (!team) throw new Error("Invalid team.");
  if (user.role !== "manager" && !user.teamSlugs.includes(team.slug)) {
    throw new Error("You do not have access to this team.");
  }
}

export async function saveDailyDayAction(
  _prev: DailyActionState,
  formData: FormData,
): Promise<DailyActionState> {
  const user = await requireUser();
  const teamId = String(formData.get("teamId") ?? "");
  const date = String(formData.get("date") ?? "");
  const teamSlug = String(formData.get("teamSlug") ?? "") as TeamSlug;

  try {
    assertTeamAccess(user, teamId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Access denied." };
  }

  const entryIds = formData.getAll("entryId").map(String);
  const existing = await getOrCreateDailyEntries(teamId, date);

  try {
    const entries = entryIds.map((entryId) => {
      const current = existing.find((entry) => entry.id === entryId);
      if (!current) {
        throw new Error("Schedule entry not found.");
      }

      const isOff = formData.get(`off_${entryId}`) === "on";
      const segmentCount = Number(formData.get(`segmentCount_${entryId}`) ?? 0);
      const segments: DailySegment[] = [];
      for (let i = 0; i < segmentCount; i += 1) {
        const timeIn = String(formData.get(`seg_${entryId}_${i}_in`) ?? "");
        const timeOut = String(formData.get(`seg_${entryId}_${i}_out`) ?? "");
        if (timeIn && timeOut) segments.push({ timeIn, timeOut });
      }

      const changed =
        current.isOff !== isOff ||
        JSON.stringify(current.segments) !== JSON.stringify(segments);

      return {
        id: current.id,
        employeeId: current.employeeId,
        employeeName: current.employeeName,
        partTimeName: current.partTimeName,
        isPartTime: current.isPartTime,
        isOff,
        segments,
        source: (changed || current.source === "manual"
          ? "manual"
          : "template") as "template" | "manual",
      };
    });

    await saveDailyEntries({ teamId, date, entries });
    revalidatePath("/admin/daily");
    revalidatePath("/");
    const team = teamBySlug(teamSlug);
    const sheetsResult = await tryPushScheduleToSheets(date, [teamId]);

    let sheetsNotice: DailyActionState["sheetsNotice"];
    if (sheetsResult.status === "success") {
      sheetsNotice = {
        type: "success",
        message: `Google Sheets updated for ${team?.name ?? "team"} (${sheetsResult.rowCount} rows).`,
      };
    } else if (sheetsResult.status === "failed") {
      sheetsNotice = {
        type: "error",
        message: "Schedule saved, but Google Sheets update failed. Try saving again.",
      };
    }

    return {
      success: `Saved ${team?.name ?? "team"} schedule for ${date}.`,
      sheetsNotice,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save schedule.",
    };
  }
}

export async function resetDailyAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const teamId = String(formData.get("teamId") ?? "");
  const date = String(formData.get("date") ?? "");
  assertTeamAccess(user, teamId);
  await resetDailyToTemplate(teamId, date);
  revalidatePath("/admin/daily");
  revalidatePath("/");
}

export async function addPartTimeAction(
  _prev: DailyActionState,
  formData: FormData,
): Promise<DailyActionState> {
  const user = await requireUser();
  const teamId = String(formData.get("teamId") ?? "");
  const date = String(formData.get("date") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");

  try {
    assertTeamAccess(user, teamId);
    const employee = getEmployeeById(employeeId);
    await addPartTimeEntry({
      teamId,
      date,
      employeeId,
    });
    revalidatePath("/admin/daily");
    revalidatePath("/");
    return {
      success: `Added ${employee?.name ?? "part-time employee"} for this day.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not add part-time.",
    };
  }
}

export async function removePartTimeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const teamId = String(formData.get("teamId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");
  assertTeamAccess(user, teamId);
  await removeDailyEntry(entryId);
  revalidatePath("/admin/daily");
  revalidatePath("/");
}
