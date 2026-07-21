"use client";

import { useActionState, useState } from "react";

import { accentButtonClassName } from "@/components/admin/AdminBackLink";
import {
  saveDayAction,
  type TemplateActionState,
} from "@/lib/templates/actions";
import { TIME_INPUT_STEP_SECONDS } from "@/lib/schedule/time-input";
import { MAX_SEGMENTS, type TemplateShift } from "@/lib/templates/types";
import type { Employee } from "@/lib/employees/types";

const initialState: TemplateActionState = {};

interface EmployeeDayState {
  employeeId: string;
  name: string;
  isOff: boolean;
  segments: { timeIn: string; timeOut: string }[];
}

function toState(
  employees: Employee[],
  shifts: TemplateShift[],
): EmployeeDayState[] {
  return employees.map((employee) => {
    const shift = shifts.find((entry) => entry.employeeId === employee.id);
    return {
      employeeId: employee.id,
      name: employee.name,
      isOff: shift?.isOff ?? true,
      segments:
        shift && !shift.isOff && shift.segments.length > 0
          ? shift.segments.map((segment) => ({ ...segment }))
          : [{ timeIn: "09:00", timeOut: "20:00" }],
    };
  });
}

interface TemplateDayEditorProps {
  versionId: string;
  teamSlug: string;
  dayOfWeek: number;
  dayLabel: string;
  employees: Employee[];
  shifts: TemplateShift[];
}

export function TemplateDayEditor({
  versionId,
  teamSlug,
  dayOfWeek,
  dayLabel,
  employees,
  shifts,
}: TemplateDayEditorProps) {
  const [rows, setRows] = useState(() => toState(employees, shifts));
  const [state, formAction, pending] = useActionState(saveDayAction, initialState);

  function updateRow(employeeId: string, patch: Partial<EmployeeDayState>) {
    setRows((current) =>
      current.map((row) =>
        row.employeeId === employeeId ? { ...row, ...patch } : row,
      ),
    );
  }

  function updateSegment(
    employeeId: string,
    index: number,
    field: "timeIn" | "timeOut",
    value: string,
  ) {
    setRows((current) =>
      current.map((row) => {
        if (row.employeeId !== employeeId) return row;
        const segments = row.segments.map((segment, i) =>
          i === index ? { ...segment, [field]: value } : segment,
        );
        return { ...row, segments };
      }),
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
      <input type="hidden" name="teamSlug" value={teamSlug} />

      <h2 className="text-sm font-semibold text-foreground">{dayLabel}</h2>

      {state.error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">
          {state.success}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {rows.map((row) => (
          <div
            key={row.employeeId}
            className="space-y-2 border-b border-border/70 px-3 py-3 last:border-b-0 sm:px-4"
          >
            <input type="hidden" name="employeeId" value={row.employeeId} />
            <input
              type="hidden"
              name={`segmentCount_${row.employeeId}`}
              value={row.isOff ? 0 : row.segments.length}
            />

            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{row.name}</p>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  name={`off_${row.employeeId}`}
                  checked={row.isOff}
                  onChange={(event) =>
                    updateRow(row.employeeId, { isOff: event.target.checked })
                  }
                  className="rounded border-border"
                />
                Off
              </label>
            </div>

            {!row.isOff ? (
              <div className="space-y-1.5">
                {row.segments.map((segment, index) => (
                  <div
                    key={`${row.employeeId}-${index}`}
                    className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5"
                  >
                    <input
                      type="time"
                      step={TIME_INPUT_STEP_SECONDS}
                      name={`seg_${row.employeeId}_${index}_in`}
                      value={segment.timeIn}
                      onChange={(event) =>
                        updateSegment(
                          row.employeeId,
                          index,
                          "timeIn",
                          event.target.value,
                        )
                      }
                      className="h-9 rounded-lg border border-border bg-surface-raised px-2 text-sm text-foreground"
                    />
                    <span className="text-xs text-muted">→</span>
                    <input
                      type="time"
                      step={TIME_INPUT_STEP_SECONDS}
                      name={`seg_${row.employeeId}_${index}_out`}
                      value={segment.timeOut}
                      onChange={(event) =>
                        updateSegment(
                          row.employeeId,
                          index,
                          "timeOut",
                          event.target.value,
                        )
                      }
                      className="h-9 rounded-lg border border-border bg-surface-raised px-2 text-sm text-foreground"
                    />
                    {row.segments.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateRow(row.employeeId, {
                            segments: row.segments.filter((_, i) => i !== index),
                          })
                        }
                        className="text-xs text-muted hover:text-red-300"
                        aria-label="Remove segment"
                      >
                        ✕
                      </button>
                    ) : (
                      <span className="w-3" />
                    )}
                  </div>
                ))}

                {row.segments.length < MAX_SEGMENTS ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateRow(row.employeeId, {
                        segments: [
                          ...row.segments,
                          { timeIn: "17:30", timeOut: "22:30" },
                        ],
                      })
                    }
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    + Add segment
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={pending}
          className={`${accentButtonClassName} disabled:opacity-60`}
        >
          {pending ? "Saving…" : "Save day"}
        </button>
      </div>
    </form>
  );
}
