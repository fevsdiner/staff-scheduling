import { randomUUID } from "crypto";

import { getEmployeeById as getLocalEmployeeById } from "@/lib/employees/demo-store";
import type { Employee, EmploymentType } from "@/lib/employees/types";
import { TEAM_OPTIONS, teamById } from "@/lib/employees/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseClient } from "@/lib/supabase/client";

const EMPLOYEE_SELECT = "id, name, team_id, active, created_at, birthday";

interface EmployeeRow {
  id: string;
  name: string;
  team_id: string;
  active: boolean;
  created_at: string;
  birthday: string | null;
}

function employmentTypeFor(id: string, fallback: EmploymentType = "regular"): EmploymentType {
  return getLocalEmployeeById(id)?.employmentType ?? fallback;
}

function mapRow(row: EmployeeRow): Employee {
  const team = teamById(row.team_id) ?? TEAM_OPTIONS[0];
  return {
    id: row.id,
    name: row.name,
    teamId: team.id,
    teamSlug: team.slug,
    teamName: team.name,
    employmentType: employmentTypeFor(row.id),
    birthday: row.birthday ?? null,
    active: row.active,
    createdAt: row.created_at,
  };
}

export async function listEmployees(): Promise<Employee[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as EmployeeRow));
}

export async function getEmployeeById(id: string): Promise<Employee | undefined> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as EmployeeRow) : undefined;
}

export async function findEmployeeByName(
  name: string,
  excludeId?: string,
): Promise<Employee | undefined> {
  const normalized = name.trim().toLowerCase();
  const employees = await listEmployees();
  return employees.find(
    (employee) =>
      employee.name.toLowerCase() === normalized && employee.id !== excludeId,
  );
}

export async function createEmployee(input: {
  name: string;
  teamId: string;
  employmentType?: EmploymentType;
  birthday?: string | null;
}): Promise<Employee> {
  const team = teamById(input.teamId);
  if (!team) throw new Error("Invalid team.");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  if (await findEmployeeByName(name)) {
    throw new Error("An employee with this name already exists.");
  }

  const supabase = createSupabaseAdminClient();
  const id = randomUUID();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("employees")
    .insert({
      id,
      name,
      team_id: team.id,
      active: true,
      birthday: input.birthday ?? null,
      created_at: now,
    })
    .select(EMPLOYEE_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return {
    ...mapRow(data as EmployeeRow),
    employmentType: input.employmentType ?? "regular",
  };
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
): Promise<Employee> {
  const team = teamById(input.teamId);
  if (!team) throw new Error("Invalid team.");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  if (await findEmployeeByName(name, id)) {
    throw new Error("An employee with this name already exists.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("employees")
    .update({
      name,
      team_id: team.id,
      active: input.active,
      birthday: input.birthday ?? null,
    })
    .eq("id", id)
    .select(EMPLOYEE_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return {
    ...mapRow(data as EmployeeRow),
    employmentType: input.employmentType,
  };
}

export async function listScheduleDatesForEmployee(employeeId: string): Promise<string[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("daily_schedules")
    .select("schedule_date")
    .eq("employee_id", employeeId);

  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((row) => row.schedule_date as string))].sort();
}
