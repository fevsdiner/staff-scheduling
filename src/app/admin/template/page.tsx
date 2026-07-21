import Link from "next/link";

import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { NewVersionForm } from "@/components/templates/NewVersionForm";
import { TemplateDayEditor } from "@/components/templates/TemplateDayEditor";
import { accessibleTeams } from "@/lib/auth/teams";
import { requireUser } from "@/lib/auth/guards";
import {
  getShiftsForDay,
  getTemplateVersion,
  listTemplateVersions,
} from "@/lib/templates/store";
import { DAYS_OF_WEEK } from "@/lib/templates/types";
import { listEmployees } from "@/lib/employees/demo-store";
import { teamBySlug, type TeamSlug } from "@/lib/employees/types";

interface TemplatePageProps {
  searchParams: Promise<{ team?: string; version?: string; day?: string }>;
}

export default async function TemplatePage({ searchParams }: TemplatePageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const teams = accessibleTeams(user);

  if (teams.length === 0) {
    return (
      <p className="text-sm text-muted">No teams assigned to your account.</p>
    );
  }

  const requestedTeam = params.team ? teamBySlug(params.team) : undefined;
  const selectedTeam =
    requestedTeam && teams.some((team) => team.id === requestedTeam.id)
      ? requestedTeam
      : teams[0];

  const versions = await listTemplateVersions(selectedTeam.id);
  const selectedVersion =
    (params.version
      ? await getTemplateVersion(params.version)
      : null) &&
    versions.some((version) => version.id === params.version)
      ? (await getTemplateVersion(params.version!))!
      : versions[0];

  if (!selectedVersion) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold text-foreground">Weekly template</h1>
        <p className="text-sm text-muted">No template versions yet for this team.</p>
        <NewVersionForm teamId={selectedTeam.id} copyFromVersionId="" />
      </div>
    );
  }

  const dayParam = Number(params.day ?? "1");
  const dayOfWeek = Number.isFinite(dayParam) && dayParam >= 0 && dayParam <= 6 ? dayParam : 1;
  const dayMeta = DAYS_OF_WEEK[dayOfWeek];

  const employees = listEmployees().filter(
    (employee) =>
      employee.teamId === selectedTeam.id &&
      employee.active &&
      employee.employmentType === "regular",
  );
  const dayShifts = getShiftsForDay(selectedVersion, dayOfWeek);

  function hrefFor(next: {
    team?: string;
    version?: string;
    day?: number;
  }) {
    const query = new URLSearchParams();
    query.set("team", next.team ?? selectedTeam.slug);
    query.set("version", next.version ?? selectedVersion.id);
    query.set("day", String(next.day ?? dayOfWeek));
    return `/admin/template?${query.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Weekly template</h1>
          <p className="mt-0.5 text-sm text-muted">
            Defaults that auto-fill daily schedules · versioned by date
          </p>
        </div>
        <AdminBackLink />
      </div>

      <section className="space-y-2 rounded-xl border border-border bg-surface p-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Team</span>
          <div className="flex flex-wrap gap-1.5">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/admin/template?team=${team.slug}`}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  team.id === selectedTeam.id
                    ? "bg-accent text-black"
                    : "border border-border text-muted hover:text-foreground"
                }`}
              >
                {team.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs text-muted">Version</span>
            <div className="flex flex-wrap gap-1.5">
              {versions.map((version) => (
                <Link
                  key={version.id}
                  href={hrefFor({ version: version.id })}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    version.id === selectedVersion.id
                      ? "bg-surface-raised text-foreground ring-1 ring-accent"
                      : "border border-border text-muted hover:text-foreground"
                  }`}
                >
                  {version.versionLabel}
                  <span className="ml-1 text-[10px] text-muted">
                    from {version.effectiveFrom}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <NewVersionForm
            teamId={selectedTeam.id}
            copyFromVersionId={selectedVersion.id}
          />
        </div>

        {selectedVersion.notes ? (
          <p className="text-xs text-muted">{selectedVersion.notes}</p>
        ) : null}
      </section>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {DAYS_OF_WEEK.map((day) => (
          <Link
            key={day.value}
            href={hrefFor({ day: day.value })}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
              day.value === dayOfWeek
                ? "bg-accent text-black"
                : "border border-border text-muted hover:text-foreground"
            }`}
          >
            {day.label}
          </Link>
        ))}
      </div>

      <TemplateDayEditor
        key={`${selectedVersion.id}-${dayOfWeek}`}
        versionId={selectedVersion.id}
        teamSlug={selectedTeam.slug as TeamSlug}
        dayOfWeek={dayOfWeek}
        dayLabel={dayMeta.full}
        employees={employees}
        shifts={dayShifts}
      />
    </div>
  );
}
