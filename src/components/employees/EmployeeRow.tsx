"use client";

import { useActionState, useEffect, useState } from "react";

import {
  toggleEmployeeActiveAction,
  updateEmployeeAction,
  type EmployeeActionState,
} from "@/lib/employees/actions";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  TEAM_OPTIONS,
  employmentTypeLabel,
  type Employee,
} from "@/lib/employees/types";

const initialState: EmployeeActionState = {};

interface EmployeeRowProps {
  employee: Employee;
}

export function EmployeeRow({ employee }: EmployeeRowProps) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateEmployeeAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      setEditing(false);
    }
  }, [state.success]);

  if (!editing) {
    return (
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-3 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_auto] sm:px-4 ${
          employee.active ? "" : "opacity-55"
        }`}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {employee.name}
          </p>
          <p className="text-xs text-muted sm:hidden">
            {employee.teamName} · {employmentTypeLabel(employee.employmentType)}
          </p>
        </div>

        <p className="hidden text-sm text-muted sm:block">{employee.teamName}</p>
        <p className="hidden text-sm text-muted sm:block">
          {employmentTypeLabel(employee.employmentType)}
        </p>

        <div className="flex items-center gap-1.5">
          {!employee.active ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Inactive
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-surface-raised"
          >
            Edit
          </button>
          <form action={toggleEmployeeActiveAction}>
            <input type="hidden" name="id" value={employee.id} />
            <input type="hidden" name="name" value={employee.name} />
            <input type="hidden" name="teamId" value={employee.teamId} />
            <input
              type="hidden"
              name="employmentType"
              value={employee.employmentType}
            />
            <input type="hidden" name="active" value={String(employee.active)} />
            <button
              type="submit"
              className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-surface-raised hover:text-foreground"
            >
              {employee.active ? "Deactivate" : "Activate"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-2 border-b border-border/70 bg-surface-raised/40 px-3 py-3 last:border-b-0 sm:px-4"
    >
      <input type="hidden" name="id" value={employee.id} />

      <div className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_7rem]">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Name</span>
          <input
            name="name"
            required
            defaultValue={employee.name}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Team</span>
          <select
            name="teamId"
            defaultValue={employee.teamId}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
          >
            {TEAM_OPTIONS.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Type</span>
          <select
            name="employmentType"
            defaultValue={employee.employmentType}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
          >
            {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Status</span>
          <select
            name="active"
            defaultValue={String(employee.active)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
        {state.error ? <p className="text-xs text-red-300">{state.error}</p> : null}
        {state.success ? (
          <p className="text-xs text-accent">{state.success}</p>
        ) : null}
      </div>
    </form>
  );
}
