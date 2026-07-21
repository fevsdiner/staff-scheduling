"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import { createEmployee, updateEmployee } from "@/lib/employees/demo-store";
import { teamById, type EmploymentType } from "@/lib/employees/types";

function parseEmploymentType(value: string): EmploymentType {
  return value === "part_time" ? "part_time" : "regular";
}

export type EmployeeActionState = {
  error?: string;
  success?: string;
};

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
    createEmployee({ name, teamId, employmentType });
    revalidatePath("/admin/employees");
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
    updateEmployee(id, { name, teamId, employmentType, active });
    revalidatePath("/admin/employees");
    return { success: "Employee updated." };
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

  updateEmployee(id, { name, teamId, employmentType, active });
  revalidatePath("/admin/employees");
}
