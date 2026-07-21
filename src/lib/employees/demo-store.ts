import { randomUUID } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";

import { canUseFileDataStore } from "@/lib/env";
import { ensureLocalDataDir, LOCAL_DATA_DIR } from "@/lib/local-data-store";
import { TEAM_OPTIONS, teamById, type Employee, type EmploymentType } from "@/lib/employees/types";

const STORE_PATH = `${LOCAL_DATA_DIR}/employees.json`;

type SeedEmployee = {
  id: string;
  name: string;
  teamId: string;
  active: boolean;
  createdAt: string;
  employmentType?: EmploymentType;
};

const KITCHEN = TEAM_OPTIONS[0].id;
const DINING = TEAM_OPTIONS[1].id;
const CREATED = "2026-02-01T00:00:00.000Z";

const SEED_EMPLOYEES: SeedEmployee[] = [
  { id: "22222222-2222-2222-2222-222222222201", name: "Rodrigo Tasic", teamId: KITCHEN, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222202", name: "Mikko Celada", teamId: KITCHEN, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222203", name: "Michael Arcenas", teamId: KITCHEN, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222204", name: "Mujahid Dicka", teamId: DINING, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222205", name: "Michael Lou Bagoyado", teamId: DINING, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222206", name: "Analiza Paelmarin", teamId: DINING, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222207", name: "Rechie Balangitao", teamId: DINING, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222208", name: "Caren Tasic", teamId: KITCHEN, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222209", name: "Jello Lacia", teamId: KITCHEN, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222210", name: "Elierma Geloca", teamId: DINING, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222211", name: "Jessa Marie O. Bautista", teamId: DINING, employmentType: "part_time", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222212", name: "Hannah Marie N. Bojos", teamId: DINING, employmentType: "part_time", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222213", name: "Jamaica Niña J. Montefalcon", teamId: DINING, employmentType: "part_time", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222214", name: "Ryza Mae J. Senarillos", teamId: DINING, employmentType: "part_time", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222215", name: "Marbie Catubig", teamId: DINING, employmentType: "part_time", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222216", name: "Alexandria Halibas", teamId: DINING, employmentType: "part_time", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222217", name: "Norsaif Panalondong", teamId: DINING, employmentType: "part_time", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222218", name: "Juliana Luisa Perfecto", teamId: DINING, employmentType: "part_time", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222219", name: "Mary Rose Pescador", teamId: DINING, employmentType: "part_time", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222220", name: "Russelle Novela", teamId: DINING, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222221", name: "Karl Christian Yancha", teamId: KITCHEN, employmentType: "regular", active: true, createdAt: CREATED },
  { id: "22222222-2222-2222-2222-222222222222", name: "Jay Francis Actub", teamId: KITCHEN, employmentType: "regular", active: true, createdAt: CREATED },
];

function hydrate(row: SeedEmployee): Employee {
  const team = teamById(row.teamId) ?? TEAM_OPTIONS[0];
  return {
    ...row,
    teamId: team.id,
    teamSlug: team.slug,
    teamName: team.name,
    employmentType: row.employmentType ?? "regular",
  };
}

let memoryEmployees: Employee[] | null = null;

function ensureStore(): Employee[] {
  if (!canUseFileDataStore()) {
    memoryEmployees ??= SEED_EMPLOYEES.map(hydrate);
    return memoryEmployees;
  }

  if (!ensureLocalDataDir()) {
    memoryEmployees ??= SEED_EMPLOYEES.map(hydrate);
    return memoryEmployees;
  }

  if (!existsSync(STORE_PATH)) {
    const seeded = SEED_EMPLOYEES.map(hydrate);
    writeFileSync(STORE_PATH, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }

  const raw = JSON.parse(readFileSync(STORE_PATH, "utf8")) as SeedEmployee[];
  return raw.map(hydrate);
}

function saveStore(employees: Employee[]): void {
  if (!canUseFileDataStore()) {
    memoryEmployees = employees;
    return;
  }

  if (!ensureLocalDataDir()) {
    memoryEmployees = employees;
    return;
  }
  const compact = employees.map(
    ({ id, name, teamId, employmentType, active, createdAt }) => ({
      id,
      name,
      teamId,
      employmentType,
      active,
      createdAt,
    }),
  );
  writeFileSync(STORE_PATH, JSON.stringify(compact, null, 2), "utf8");
}

export function listEmployees(): Employee[] {
  return ensureStore().sort((a, b) => {
    if (a.teamName !== b.teamName) return a.teamName.localeCompare(b.teamName);
    return a.name.localeCompare(b.name);
  });
}

export function findEmployeeByName(
  name: string,
  excludeId?: string,
): Employee | undefined {
  const normalized = name.trim().toLowerCase();
  return ensureStore().find(
    (employee) =>
      employee.name.toLowerCase() === normalized && employee.id !== excludeId,
  );
}

export function listPartTimeEmployees(teamId?: string): Employee[] {
  return listEmployees().filter(
    (employee) =>
      employee.active &&
      employee.employmentType === "part_time" &&
      (!teamId || employee.teamId === teamId),
  );
}

export function getEmployeeById(id: string): Employee | undefined {
  return ensureStore().find((employee) => employee.id === id);
}

export function createEmployee(input: {
  name: string;
  teamId: string;
  employmentType?: EmploymentType;
}): Employee {
  const team = teamById(input.teamId);
  if (!team) {
    throw new Error("Invalid team.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Name is required.");
  }
  if (findEmployeeByName(name)) {
    throw new Error("An employee with this name already exists.");
  }

  const employees = ensureStore();
  const employee = hydrate({
    id: randomUUID(),
    name,
    teamId: team.id,
    employmentType: input.employmentType ?? "regular",
    active: true,
    createdAt: new Date().toISOString(),
  });
  employees.push(employee);
  saveStore(employees);
  return employee;
}

export function updateEmployee(
  id: string,
  input: {
    name: string;
    teamId: string;
    employmentType: EmploymentType;
    active: boolean;
  },
): Employee {
  const team = teamById(input.teamId);
  if (!team) {
    throw new Error("Invalid team.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Name is required.");
  }
  if (findEmployeeByName(name, id)) {
    throw new Error("An employee with this name already exists.");
  }

  const employees = ensureStore();
  const index = employees.findIndex((employee) => employee.id === id);
  if (index < 0) {
    throw new Error("Employee not found.");
  }

  const updated = hydrate({
    id,
    name,
    teamId: team.id,
    employmentType: input.employmentType,
    active: input.active,
    createdAt: employees[index].createdAt,
  });
  employees[index] = updated;
  saveStore(employees);
  return updated;
}
