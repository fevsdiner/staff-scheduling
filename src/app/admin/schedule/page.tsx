import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { DailyFilters } from "@/components/daily/DailyFilters";
import { PublicScheduleView } from "@/components/schedule/PublicScheduleView";
import { resolveAdminTeamFilter } from "@/lib/auth/admin-team-filter";
import { accessibleTeams } from "@/lib/auth/teams";
import { requireUser } from "@/lib/auth/guards";
import {
  formatDisplayDate,
  getManilaTomorrow,
  isValidDateString,
} from "@/lib/schedule/datetime";
import { getScheduleForDate } from "@/lib/schedule/queries";

interface AdminSchedulePageProps {
  searchParams: Promise<{ date?: string; team?: string }>;
}

export default async function AdminSchedulePage({
  searchParams,
}: AdminSchedulePageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const teams = accessibleTeams(user);

  if (teams.length === 0) {
    return <p className="text-sm text-muted">No teams assigned to your account.</p>;
  }

  const defaultDate = getManilaTomorrow();
  const selectedDate =
    params.date && isValidDateString(params.date) ? params.date : defaultDate;

  const { selectedTeamSlug, defaultTeamSlug, showAllTeams } = resolveAdminTeamFilter(
    user,
    teams,
    params.team,
    { allowAllTeams: true },
  );

  const schedule = await getScheduleForDate(selectedDate, selectedTeamSlug);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Daily Schedule View</h1>
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
          basePath="/admin/schedule"
          showAllTeams={showAllTeams}
        />

        <p className="text-xs text-muted">
          Read-only view — same schedule staff see on the home page.
        </p>
      </section>

      <PublicScheduleView schedule={schedule} />
    </div>
  );
}
