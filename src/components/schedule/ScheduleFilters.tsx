"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface ScheduleFiltersProps {
  selectedDate: string;
  selectedTeam: string;
  teams: { name: string; slug: string }[];
  defaultDate: string;
}

export function ScheduleFilters({
  selectedDate,
  selectedTeam,
  teams,
  defaultDate,
}: ScheduleFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateFilters(nextDate: string, nextTeam: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextDate === defaultDate) {
      params.delete("date");
    } else {
      params.set("date", nextDate);
    }

    if (nextTeam === "all") {
      params.delete("team");
    } else {
      params.set("team", nextTeam);
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/?${query}` : "/");
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">Date</span>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => updateFilters(event.target.value, selectedTeam)}
          className="h-10 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">Team</span>
        <select
          value={selectedTeam}
          onChange={(event) => updateFilters(selectedDate, event.target.value)}
          className="h-10 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
        >
          {teams.map((team) => (
            <option key={team.slug} value={team.slug}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      {isPending ? (
        <p className="col-span-2 text-xs text-muted">Loading…</p>
      ) : null}
    </div>
  );
}
