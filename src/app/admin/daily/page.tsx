import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { DailyFilters } from "@/components/daily/DailyFilters";
import { DailyScheduleEditor } from "@/components/daily/DailyScheduleEditor";
import { accessibleTeams } from "@/lib/auth/teams";
import { requireUser } from "@/lib/auth/guards";
import { getOrCreateDailyEntries } from "@/lib/daily/demo-store";
import { listPartTimeEmployees } from "@/lib/employees/demo-store";
import { teamBySlug, type TeamSlug } from "@/lib/employees/types";
import {
  formatDisplayDate,
  getManilaTomorrow,
  isValidDateString,
} from "@/lib/schedule/datetime";
import { getTemplateVersionForDate } from "@/lib/templates/demo-store";

interface DailyPageProps {
  searchParams: Promise<{ date?: string; team?: string }>;
}

export default async function DailyPage({ searchParams }: DailyPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const teams = accessibleTeams(user);

  if (teams.length === 0) {
    return <p className="text-sm text-muted">No teams assigned to your account.</p>;
  }

  const defaultDate = getManilaTomorrow();
  const selectedDate =
    params.date && isValidDateString(params.date) ? params.date : defaultDate;

  const requestedTeam = params.team ? teamBySlug(params.team) : undefined;
  const selectedTeam =
    requestedTeam && teams.some((team) => team.id === requestedTeam.id)
      ? requestedTeam
      : teams[0];

  const entries = getOrCreateDailyEntries(selectedTeam.id, selectedDate);
  const template = getTemplateVersionForDate(selectedTeam.id, selectedDate);
  const scheduledEmployeeIds = new Set(
    entries.map((entry) => entry.employeeId).filter(Boolean),
  );
  const availablePartTime = listPartTimeEmployees(selectedTeam.id).filter(
    (employee) => !scheduledEmployeeIds.has(employee.id),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Daily schedule</h1>
          <p className="mt-0.5 text-sm text-muted">
            {formatDisplayDate(selectedDate)}
            {selectedDate === defaultDate ? " · tomorrow" : ""}
          </p>
        </div>
        <AdminBackLink />
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-surface p-3">
        <DailyFilters
          selectedDate={selectedDate}
          selectedTeamSlug={selectedTeam.slug}
          teams={teams}
          defaultDate={defaultDate}
          firstTeamSlug={teams[0].slug}
        />

        <p className="text-xs text-muted">
          Template:{" "}
          {template
            ? `${template.versionLabel} (from ${template.effectiveFrom})`
            : "none — employees marked Off until a template exists"}
        </p>
      </section>

      <DailyScheduleEditor
        key={`${selectedTeam.id}-${selectedDate}-${entries.map((e) => e.id).join(",")}`}
        teamId={selectedTeam.id}
        teamSlug={selectedTeam.slug as TeamSlug}
        date={selectedDate}
        entries={entries}
        availablePartTime={availablePartTime}
      />
    </div>
  );
}
