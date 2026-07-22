import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { DailyFilters } from "@/components/daily/DailyFilters";
import { DailyScheduleEditor } from "@/components/daily/DailyScheduleEditor";
import { PublicScheduleView } from "@/components/schedule/PublicScheduleView";
import { resolveAdminTeamFilter } from "@/lib/auth/admin-team-filter";
import { accessibleTeams } from "@/lib/auth/teams";
import { requireUser } from "@/lib/auth/guards";
import { getOrCreateDailyEntries } from "@/lib/daily/store";
import { listPartTimeEmployees } from "@/lib/employees/demo-store";
import type { TeamSlug } from "@/lib/employees/types";
import {
  formatDisplayDate,
  getManilaTomorrow,
  isValidDateString,
} from "@/lib/schedule/datetime";
import { getScheduleForDate } from "@/lib/schedule/queries";
import { getTemplateVersionForDate } from "@/lib/templates/store";

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

  const { selectedTeamSlug, defaultTeamSlug, showAllTeams, selectedTeam } =
    resolveAdminTeamFilter(user, teams, params.team);

  const viewingAllTeams = selectedTeamSlug === "all";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Daily Schedule Editor</h1>
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
          selectedTeamSlug={selectedTeamSlug}
          teams={teams}
          defaultDate={defaultDate}
          defaultTeamSlug={defaultTeamSlug}
          showAllTeams={showAllTeams}
        />

        {viewingAllTeams ? (
          <p className="text-xs text-muted">
            Select a single team to edit shifts. All Teams shows a read-only overview.
          </p>
        ) : (
          <TemplateNote teamId={selectedTeam!.id} date={selectedDate} />
        )}
      </section>

      {viewingAllTeams ? (
        <PublicScheduleView
          schedule={await getScheduleForDate(selectedDate, "all")}
        />
      ) : (
        <DailyEditorSection
          teamId={selectedTeam!.id}
          teamSlug={selectedTeam!.slug as TeamSlug}
          date={selectedDate}
        />
      )}
    </div>
  );
}

async function TemplateNote({ teamId, date }: { teamId: string; date: string }) {
  const template = await getTemplateVersionForDate(teamId, date);

  return (
    <p className="text-xs text-muted">
      Template:{" "}
      {template
        ? `${template.versionLabel} (from ${template.effectiveFrom})`
        : "none — employees marked Off until a template exists"}
    </p>
  );
}

async function DailyEditorSection({
  teamId,
  teamSlug,
  date,
}: {
  teamId: string;
  teamSlug: TeamSlug;
  date: string;
}) {
  const entries = await getOrCreateDailyEntries(teamId, date);
  const scheduledEmployeeIds = new Set(
    entries.map((entry) => entry.employeeId).filter(Boolean),
  );
  const availablePartTime = listPartTimeEmployees(teamId).filter(
    (employee) => !scheduledEmployeeIds.has(employee.id),
  );

  return (
    <DailyScheduleEditor
      key={`${teamId}-${date}-${entries.map((entry) => entry.id).join(",")}`}
      teamId={teamId}
      teamSlug={teamSlug}
      date={date}
      entries={entries}
      availablePartTime={availablePartTime}
    />
  );
}
