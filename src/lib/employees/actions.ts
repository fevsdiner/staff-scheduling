"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import {
  createEmployee,
  updateEmployee,
} from "@/lib/employees/store";
import { parseBirthdayInput } from "@/lib/employees/birthday";
import { teamById, type EmploymentType } from "@/lib/employees/types";

function parseEmploymentType(value: string): EmploymentType {
  return value === "part_time" ? "part_time" : "regular";
}

export type EmployeeActionState = {
  error?: string;
  success?: string;
  sheetsNotice?: {
    type: "success" | "error";
    message: string;
  };
};

function revalidateScheduleViews(): void {
  revalidatePath("/admin/employees");
  revalidatePath("/admin/daily");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/template");
  revalidatePath("/");
}

export async function createEmployeeAction(
  _prev: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  await requireRole(["manager"]);

  const name = String(formData.get("name") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const employmentType = parseEmploymentType(
    String(formData.get("employmentType") ?? "regular"),
  );

  if (!teamById(teamId)) {
    return { error: "Please choose a valid team." };
  }

  try {
    const birthday = parseBirthdayInput(String(formData.get("birthday") ?? ""));
    await createEmployee({ name, teamId, employmentType, birthday });
    revalidateScheduleViews();
    return { success: "Employee added." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not add employee.",
    };
  }
}

export async function updateEmployeeAction(
  _prev: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  await requireRole(["manager"]);

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const active = String(formData.get("active") ?? "true") === "true";
  const employmentType = parseEmploymentType(
    String(formData.get("employmentType") ?? "regular"),
  );

  if (!id) {
    return { error: "Missing employee id." };
  }
  if (!teamById(teamId)) {
    return { error: "Please choose a valid team." };
  }

  try {
    const previousName = String(formData.get("previousName") ?? "");
    const birthday = parseBirthdayInput(String(formData.get("birthday") ?? ""));
    const { sheetsSync } = await updateEmployee(id, {
      name,
      teamId,
      employmentType,
      birthday,
      active,
    });
    revalidateScheduleViews();

    const renamed = previousName.trim() !== "" && previousName.trim() !== name.trim();
    let sheetsNotice: EmployeeActionState["sheetsNotice"];
    if (renamed) {
      if (sheetsSync?.status === "success") {
        sheetsNotice = {
          type: "success",
          message: "Saved schedules and Google Sheets were updated with the new name.",
        };
      } else if (sheetsSync?.status === "failed") {
        sheetsNotice = {
          type: "error",
          message:
            "Name saved in the app, but Google Sheets could not be updated. Try Save Day or run sheets sync.",
        };
      } else if (renamed) {
        sheetsNotice = {
          type: "success",
          message: "Name updated everywhere in the app.",
        };
      }
    }

    return {
      success: "Employee updated.",
      sheetsNotice,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update employee.",
    };
  }
}

export async function toggleEmployeeActiveAction(formData: FormData): Promise<void> {
  await requireRole(["manager"]);

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const employmentType = parseEmploymentType(
    String(formData.get("employmentType") ?? "regular"),
  );
  const active = String(formData.get("active") ?? "true") !== "true";
  const birthday = parseBirthdayInput(String(formData.get("birthday") ?? ""));

  await updateEmployee(id, { name, teamId, employmentType, birthday, active });
  revalidateScheduleViews();
}
