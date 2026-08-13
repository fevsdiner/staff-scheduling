import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { AddEmployeeForm } from "@/components/employees/AddEmployeeForm";
import { EmployeeRow } from "@/components/employees/EmployeeRow";
import { requireRole } from "@/lib/auth/guards";
import { listEmployees } from "@/lib/employees/store";
import { TEAM_OPTIONS } from "@/lib/employees/types";

interface EmployeesPageProps {
  searchParams: Promise<{ team?: string; show?: string }>;
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  await requireRole(["manager"]);
  const params = await searchParams;
  const teamFilter = params.team ?? "all";
  const showInactive = params.show === "inactive";

  const employees = (await listEmployees()).filter((employee) => {
    if (!showInactive && !employee.active) return false;
    if (teamFilter !== "all" && employee.teamSlug !== teamFilter) return false;
    return true;
  });

  const activeCount = (await listEmployees()).filter((employee) => employee.active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Employees</h1>
          <p className="mt-0.5 text-sm text-muted">
            Permanent roster · {activeCount} active
          </p>
        </div>
        <AdminBackLink />
      </div>

      <AddEmployeeForm />

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <form className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Team
              <select
                name="team"
                defaultValue={teamFilter}
                className="h-8 rounded-md border border-border bg-surface-raised px-2 text-xs text-foreground"
              >
                <option value="all">All</option>
                {TEAM_OPTIONS.map((team) => (
                  <option key={team.slug} value={team.slug}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                name="show"
                value="inactive"
                defaultChecked={showInactive}
                className="rounded border-border"
              />
              Show inactive
            </label>

            <button
              type="submit"
              className="h-8 rounded-md border border-border px-2.5 text-xs text-foreground hover:bg-surface-raised"
            >
              Apply
            </button>
          </form>
        </div>

        {employees.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            No employees match these filters.
          </p>
        ) : (
          <div>
            {employees.map((employee) => (
              <EmployeeRow key={employee.id} employee={employee} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
