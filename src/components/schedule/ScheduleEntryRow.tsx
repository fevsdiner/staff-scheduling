import { formatSegmentRange } from "@/lib/schedule/datetime";
import type { ScheduleEntry } from "@/lib/schedule/types";

interface ScheduleEntryRowProps {
  entry: ScheduleEntry;
}

export function ScheduleEntryRow({ entry }: ScheduleEntryRowProps) {
  const showUpdated = !entry.isOff && entry.source === "manual";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 border-b border-border/70 px-3 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_1rem] sm:gap-x-3 sm:px-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
        {entry.isSwapOff ? (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Swap Off
          </p>
        ) : null}
      </div>

      <div className="col-start-1 row-start-2 min-w-0 sm:col-start-2 sm:row-start-1">
        {entry.isOff ? (
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">OFF</p>
        ) : entry.segments.length === 0 ? (
          <p className="text-sm text-muted">—</p>
        ) : (
          <p className="text-sm tabular-nums text-muted">
            {entry.segments.map((segment, index) => (
              <span key={`${entry.id}-${index}`}>
                {index > 0 ? (
                  <span className="mx-1.5 text-border" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <span className="text-foreground/90">{formatSegmentRange(segment)}</span>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="col-start-2 row-span-2 flex h-full items-center justify-end self-center sm:col-start-3 sm:row-span-1 sm:row-start-1">
        {showUpdated ? (
          <span
            title="Updated"
            aria-label="Updated"
            className="text-xs font-bold leading-none text-accent"
          >
            U
          </span>
        ) : (
          <span className="inline-block w-3" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
