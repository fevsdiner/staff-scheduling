import { ScheduleEntryRow } from "@/components/schedule/ScheduleEntryRow";
import type { DaySchedule } from "@/lib/schedule/types";

interface PublicScheduleViewProps {
  schedule: DaySchedule;
}

export function PublicScheduleView({ schedule }: PublicScheduleViewProps) {
  if (schedule.teams.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">No schedule posted for this date.</p>
        <p className="mt-1 text-xs text-muted">
          A supervisor must save the day in admin before it appears here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schedule.teams.map((team) => (
        <section
          key={team.id}
          className="overflow-hidden rounded-xl border border-border bg-surface"
        >
          <header className="flex items-center justify-between gap-2 border-b border-border bg-surface-raised px-3 py-2 sm:px-4">
            <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
              {team.name}
            </h2>
            <span className="text-xs tabular-nums text-muted">{team.entries.length}</span>
          </header>

          <div>
            {team.entries.map((entry) => (
              <ScheduleEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
