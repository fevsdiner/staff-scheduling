"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import {
  addPartTimeAction,
  removePartTimeAction,
  resetDailyAction,
  saveDailyDayAction,
  type DailyActionState,
} from "@/lib/daily/actions";
import { accentButtonClassName } from "@/components/admin/AdminBackLink";
import { ShiftSegmentFields } from "@/components/schedule/ShiftSegmentFields";
import type { DailyEntry } from "@/lib/daily/types";
import { sortDailyEntries } from "@/lib/daily/sort";
import { formatEmployeeDisplayName } from "@/lib/employees/display";
import type { Employee } from "@/lib/employees/types";
import { validateShiftSegments } from "@/lib/schedule/validate-segments";

const initialState: DailyActionState = {};

const saveButtonClassName = `${accentButtonClassName} disabled:opacity-60`;

interface RowState {
  id: string;
  employeeName: string;
  isPartTime: boolean;
  isOff: boolean;
  source: "template" | "manual";
  segments: { timeIn: string; timeOut: string }[];
}

function toRows(entries: DailyEntry[]): RowState[] {
  return sortDailyEntries(entries).map((entry) => ({
    id: entry.id,
    employeeName: entry.employeeName,
    isPartTime: entry.isPartTime,
    isOff: entry.isOff,
    source: entry.source,
    segments:
      !entry.isOff && entry.segments.length > 0
        ? entry.segments.map((segment) => ({ ...segment }))
        : [{ timeIn: "09:00", timeOut: "20:00" }],
  }));
}

interface DailyScheduleEditorProps {
  teamId: string;
  teamSlug: string;
  date: string;
  entries: DailyEntry[];
  availablePartTime: Employee[];
}

export function DailyScheduleEditor({
  teamId,
  teamSlug,
  date,
  entries,
  availablePartTime,
}: DailyScheduleEditorProps) {
  const router = useRouter();
  const [rows, setRows] = useState(() => toRows(entries));
  const [state, formAction, pending] = useActionState(
    saveDailyDayAction,
    initialState,
  );
  const [ptState, ptAction, ptPending] = useActionState(
    addPartTimeAction,
    initialState,
  );

  useEffect(() => {
    setRows(toRows(entries));
  }, [entries]);

  useEffect(() => {
    if (ptState.success) {
      router.refresh();
    }
  }, [ptState.success, router]);

  const rowValidations = useMemo(
    () =>
      rows.map((row) =>
        row.isOff
          ? { segments: [], hasErrors: false }
          : validateShiftSegments(row.segments, row.employeeName),
      ),
    [rows],
  );
  const hasValidationErrors = rowValidations.some((validation) => validation.hasErrors);

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function updateSegment(
    id: string,
    index: number,
    field: "timeIn" | "timeOut",
    value: string,
  ) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const segments = row.segments.map((segment, i) =>
          i === index ? { ...segment, [field]: value } : segment,
        );
        return { ...row, segments };
      }),
    );
  }

  return (
    <div className="space-y-3">
      <form id="daily-save-form" action={formAction} className="hidden">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="teamSlug" value={teamSlug} />
        <input type="hidden" name="date" value={date} />
      </form>

      <p className="text-xs text-muted">
        Auto-filled from weekly template. Edits apply to this date only.
      </p>

      {state.error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {state.error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {rows.map((row, rowIndex) => (
          <div
            key={row.id}
            className="space-y-2 border-b border-border/70 px-3 py-3 last:border-b-0 sm:px-4"
          >
            <input form="daily-save-form" type="hidden" name="entryId" value={row.id} />
            <input
              form="daily-save-form"
              type="hidden"
              name={`segmentCount_${row.id}`}
              value={row.isOff ? 0 : row.segments.length}
            />

            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-foreground">
                {formatEmployeeDisplayName(row.employeeName, row.isPartTime)}
              </p>
              <div className="flex items-center gap-2">
                {row.source === "manual" && !row.isOff ? (
                  <span className="text-xs font-bold text-accent" title="Updated">
                    U
                  </span>
                ) : null}
                {row.isPartTime ? (
                  <>
                    <form id={`remove-${row.id}`} action={removePartTimeAction}>
                      <input type="hidden" name="teamId" value={teamId} />
                      <input type="hidden" name="entryId" value={row.id} />
                    </form>
                    <button
                      type="submit"
                      form={`remove-${row.id}`}
                      className="text-xs text-red-300 hover:underline"
                    >
                      Remove
                    </button>
                  </>
                ) : null}
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    form="daily-save-form"
                    type="checkbox"
                    name={`off_${row.id}`}
                    checked={row.isOff}
                    onChange={(event) =>
                      updateRow(row.id, { isOff: event.target.checked })
                    }
                    className="rounded border-border"
                  />
                  Off
                </label>
              </div>
            </div>

            {!row.isOff ? (
              <ShiftSegmentFields
                fieldId={row.id}
                formId="daily-save-form"
                segments={row.segments}
                validation={rowValidations[rowIndex]}
                onSegmentChange={(index, field, value) =>
                  updateSegment(row.id, index, field, value)
                }
                onRemoveSegment={(index) =>
                  updateRow(row.id, {
                    segments: row.segments.filter((_, i) => i !== index),
                  })
                }
                onAddSegment={() =>
                  updateRow(row.id, {
                    segments: [
                      ...row.segments,
                      { timeIn: "17:30", timeOut: "22:30" },
                    ],
                  })
                }
              />
            ) : null}
          </div>
        ))}
      </div>

      <form
        key={availablePartTime.map((employee) => employee.id).join(",") || "none"}
        action={ptAction}
        className="space-y-2 rounded-xl border border-border bg-surface p-3"
      >
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="date" value={date} />
        <p className="text-sm font-semibold text-foreground">
          Add part-time (this day only)
        </p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <select
            name="employeeId"
            required={availablePartTime.length > 0}
            disabled={availablePartTime.length === 0}
            defaultValue=""
            className="h-9 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground disabled:opacity-60"
          >
            <option value="" disabled>
              {availablePartTime.length > 0
                ? "Select part-time employee"
                : "No part-time employees available for this team"}
            </option>
            {availablePartTime.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={ptPending || availablePartTime.length === 0}
            className="h-9 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-surface-raised disabled:opacity-60"
          >
            {ptPending ? "Adding…" : "Add"}
          </button>
        </div>
        {ptState.error ? (
          <p className="text-xs text-red-300">{ptState.error}</p>
        ) : null}
        {ptState.success ? (
          <p className="text-xs text-accent">{ptState.success}</p>
        ) : null}
      </form>

      <div className="space-y-2 border-t border-border/70 pt-3">
        {state.success ? (
          <p
            className="rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent"
            role="status"
          >
            {state.success}
          </p>
        ) : null}
        {state.sheetsNotice ? (
          <p
            className={`rounded-lg border px-3 py-2 text-xs ${
              state.sheetsNotice.type === "success"
                ? "border-green-500/40 bg-green-500/10 text-green-300"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
            role="status"
          >
            {state.sheetsNotice.message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
        <form action={resetDailyAction}>
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="date" value={date} />
          <button
            type="submit"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-raised"
            onClick={(event) => {
              if (
                !confirm(
                  "Revert to the weekly template? Manual edits and part-timers for this day will be removed.",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            Revert Template
          </button>
        </form>

        <div className="flex flex-col items-end gap-1">
          <button
            type="submit"
            form="daily-save-form"
            disabled={pending || hasValidationErrors}
            className={saveButtonClassName}
          >
            {pending ? "Saving…" : "Save Day"}
          </button>
          {hasValidationErrors ? (
            <p className="text-xs text-red-300">Fix time errors before saving.</p>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  );
}
