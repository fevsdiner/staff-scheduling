import { canUseFileDataStore } from "@/lib/env";
import * as demoStore from "@/lib/employees/demo-store";
import { propagateEmployeeRename } from "@/lib/employees/propagate-rename";
import * as supabaseStore from "@/lib/employees/supabase-store";
import type { Employee, EmploymentType } from "@/lib/employees/types";
import type { SheetsPushResult } from "@/lib/sheets/actions";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const MISSING_SERVICE_ROLE_MESSAGE =
  "Add SUPABASE_SERVICE_ROLE_KEY to Vercel to save employee changes.";

export async function listEmployees(): Promise<Employee[]> {
  if (isSupabaseConfigured()) {
    try {
      return await supabaseStore.listEmployees();
    } catch (error) {
      console.error("Supabase employee list failed:", error);
    }
  }
  return demoStore.listEmployees();
}

export async function getEmployeeById(id: string): Promise<Employee | undefined> {
  if (isSupabaseConfigured()) {
    try {
      return await supabaseStore.getEmployeeById(id);
    } catch (error) {
      console.error("Supabase employee fetch failed:", error);
    }
  }
  return demoStore.getEmployeeById(id);
}

export async function listPartTimeEmployees(teamId?: string): Promise<Employee[]> {
  const employees = await listEmployees();
  return employees.filter(
    (employee) =>
      employee.active &&
      employee.employmentType === "part_time" &&
      (!teamId || employee.teamId === teamId),
  );
}

export async function createEmployee(input: {
  name: string;
  teamId: string;
  employmentType?: EmploymentType;
  birthday?: string | null;
}): Promise<Employee> {
  if (isSupabaseAdminConfigured()) {
    return supabaseStore.createEmployee(input);
  }
  if (process.env.VERCEL && isSupabaseConfigured()) {
    throw new Error(MISSING_SERVICE_ROLE_MESSAGE);
  }
  return demoStore.createEmployee(input);
}

export async function updateEmployee(
  id: string,
  input: {
    name: string;
    teamId: string;
    employmentType: EmploymentType;
    birthday?: string | null;
    active: boolean;
  },
): Promise<{ employee: Employee; sheetsSync: SheetsPushResult | null }> {
  const previous = await getEmployeeById(id);
  if (!previous) {
    throw new Error("Employee not found.");
  }

  let updated: Employee;
  if (isSupabaseAdminConfigured()) {
    updated = await supabaseStore.updateEmployee(id, input);
    if (canUseFileDataStore()) {
      try {
        demoStore.updateEmployee(id, input);
      } catch {
        /* local mirror is best-effort */
      }
    }
  } else if (process.env.VERCEL && isSupabaseConfigured()) {
    throw new Error(MISSING_SERVICE_ROLE_MESSAGE);
  } else {
    updated = demoStore.updateEmployee(id, input);
  }

  const renamed = previous.name.trim() !== input.name.trim();
  const sheetsSync = renamed
    ? await propagateEmployeeRename(id, input.name.trim())
    : null;

  return { employee: updated, sheetsSync };
}
