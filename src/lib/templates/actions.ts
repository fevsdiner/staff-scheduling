"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/guards";
import type { AuthUser } from "@/lib/auth/types";
import { teamById, teamBySlug, type TeamSlug } from "@/lib/employees/types";
import {
  createTemplateVersion,
  getTemplateVersion,
  saveDayShifts,
} from "@/lib/templates/demo-store";
import type { TemplateSegment } from "@/lib/templates/types";

export type TemplateActionState = {
  error?: string;
  success?: string;
};

function assertTeamAccess(user: AuthUser, teamId: string): void {
  const team = teamById(teamId);
  if (!team) {
    throw new Error("Invalid team.");
  }
  if (user.role !== "manager" && !user.teamSlugs.includes(team.slug)) {
    throw new Error("You do not have access to this team.");
  }
}

export async function createVersionAction(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  const user = await requireUser();
  const teamId = String(formData.get("teamId") ?? "");
  const versionLabel = String(formData.get("versionLabel") ?? "");
  const effectiveFrom = String(formData.get("effectiveFrom") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const copyFromVersionId = String(formData.get("copyFromVersionId") ?? "");

  try {
    assertTeamAccess(user, teamId);
    const version = createTemplateVersion({
      teamId,
      versionLabel,
      effectiveFrom,
      notes,
      copyFromVersionId: copyFromVersionId || undefined,
    });
    const team = teamById(teamId)!;
    revalidatePath("/admin/template");
    redirect(
      `/admin/template?team=${team.slug}&version=${version.id}&day=1`,
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    return {
      error:
        error instanceof Error ? error.message : "Could not create version.",
    };
  }
}

export async function saveDayAction(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  const user = await requireUser();
  const versionId = String(formData.get("versionId") ?? "");
  const dayOfWeek = Number(formData.get("dayOfWeek") ?? -1);
  const teamSlug = String(formData.get("teamSlug") ?? "") as TeamSlug;

  const version = getTemplateVersion(versionId);
  if (!version) {
    return { error: "Template version not found." };
  }

  try {
    assertTeamAccess(user, version.teamId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  const employeeIds = formData.getAll("employeeId").map(String);
  const shifts = employeeIds.map((employeeId) => {
    const isOff = formData.get(`off_${employeeId}`) === "on";
    const segmentCount = Number(formData.get(`segmentCount_${employeeId}`) ?? 0);
    const segments: TemplateSegment[] = [];

    for (let i = 0; i < segmentCount; i += 1) {
      const timeIn = String(formData.get(`seg_${employeeId}_${i}_in`) ?? "");
      const timeOut = String(formData.get(`seg_${employeeId}_${i}_out`) ?? "");
      if (timeIn && timeOut) {
        segments.push({ timeIn, timeOut });
      }
    }

    return { employeeId, isOff, segments };
  });

  try {
    saveDayShifts({ versionId, dayOfWeek, shifts });
    revalidatePath("/admin/template");
    const team = teamBySlug(teamSlug);
    return {
      success: `Saved ${team?.name ?? "team"} template for this day.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save day.",
    };
  }
}
