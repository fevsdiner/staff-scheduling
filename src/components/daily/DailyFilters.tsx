"use client";

import { useRouter } from "next/navigation";

import type { TeamOption } from "@/lib/employees/types";

interface DailyFiltersProps {
  selectedDate: string;
  selectedTeamSlug: string;
  teams: TeamOption[];
  defaultDate: string;
  firstTeamSlug: string;
}

function buildHref(
  date: string,
  teamSlug: string,
  defaultDate: string,
  firstTeamSlug: string,
): string {
  const query = new URLSearchParams();
  if (date !== defaultDate) query.set("date", date);
  if (teamSlug !== firstTeamSlug) query.set("team", teamSlug);
  const qs = query.toString();
  return qs ? `/admin/daily?${qs}` : "/admin/daily";
}

export function DailyFilters({
  selectedDate,
  selectedTeamSlug,
  teams,
  defaultDate,
  firstTeamSlug,
}: DailyFiltersProps) {
  const router = useRouter();

  function navigate(nextDate: string, nextTeamSlug: string) {
    router.push(buildHref(nextDate, nextTeamSlug, defaultDate, firstTeamSlug));
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Date</span>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => navigate(event.target.value, selectedTeamSlug)}
          className="h-10 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Team</span>
        <select
          value={selectedTeamSlug}
          onChange={(event) => navigate(selectedDate, event.target.value)}
          className="h-10 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.slug}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
