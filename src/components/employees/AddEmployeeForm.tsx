"use client";

import { useActionState } from "react";

import {
  createEmployeeAction,
  type EmployeeActionState,
} from "@/lib/employees/actions";
import { EMPLOYMENT_TYPE_OPTIONS, TEAM_OPTIONS } from "@/lib/employees/types";

const initialState: EmployeeActionState = {};

export function AddEmployeeForm() {
  const [state, formAction, pending] = useActionState(
    createEmployeeAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-border bg-surface p-3">
      <h2 className="text-sm font-semibold text-foreground">Add employee</h2>

      <div className="grid gap-2 sm:grid-cols-[1fr_8rem_8rem_8rem_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Name</span>
          <input
            name="name"
            required
            placeholder="Full name"
            className="h-10 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Team</span>
          <select
            name="teamId"
            required
            defaultValue={TEAM_OPTIONS[0].id}
            className="h-10 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
            required
            defaultValue="regular"
            className="h-10 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Birthday</span>
          <input
            name="birthday"
            placeholder="MM/DD/YYYY"
            inputMode="numeric"
            autoComplete="bday"
            className="h-10 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="h-10 w-full rounded-lg bg-accent px-4 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      {state.error ? (
        <p className="text-xs text-red-300">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-xs text-accent">{state.success}</p>
      ) : null}
    </form>
  );
}
