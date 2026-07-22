"use client";

import { useActionState, useMemo, useState } from "react";

import { accentButtonClassName } from "@/components/admin/AdminBackLink";
import { ShiftSegmentFields } from "@/components/schedule/ShiftSegmentFields";
import {
  saveDayAction,
  type TemplateActionState,
} from "@/lib/templates/actions";
import { validateShiftSegments } from "@/lib/schedule/validate-segments";
import type { TemplateShift } from "@/lib/templates/types";
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

  const rowValidations = useMemo(
    () =>
      rows.map((row) =>
        row.isOff
          ? { segmentErrors: [] as (string | null)[], hasErrors: false }
          : validateShiftSegments(row.segments, row.name),
      ),
    [rows],
  );
  const hasValidationErrors = rowValidations.some((validation) => validation.hasErrors);

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
        {rows.map((row, rowIndex) => (
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
              <ShiftSegmentFields
                fieldId={row.employeeId}
                segments={row.segments}
                validation={rowValidations[rowIndex]}
                onSegmentChange={(index, field, value) =>
                  updateSegment(row.employeeId, index, field, value)
                }
                onRemoveSegment={(index) =>
                  updateRow(row.employeeId, {
                    segments: row.segments.filter((_, i) => i !== index),
                  })
                }
                onAddSegment={() =>
                  updateRow(row.employeeId, {
                    segments: [
                      ...row.segments,
                      { timeIn: "17:30", timeOut: "22:30" },
                    ],
                  })
                }
                addLabel="+ Add segment"
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-1">
        {hasValidationErrors ? (
          <p className="text-xs text-red-300">Fix time errors before saving.</p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || hasValidationErrors}
            className={`${accentButtonClassName} disabled:opacity-60`}
          >
            {pending ? "Saving…" : "Save day"}
          </button>
        </div>
      </div>
    </form>
  );
}
