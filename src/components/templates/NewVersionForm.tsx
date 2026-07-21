"use client";

import { useActionState, useState } from "react";

import {
  createVersionAction,
  type TemplateActionState,
} from "@/lib/templates/actions";
import { getManilaDateString } from "@/lib/schedule/datetime";

const initialState: TemplateActionState = {};

interface NewVersionFormProps {
  teamId: string;
  copyFromVersionId: string;
}

export function NewVersionForm({
  teamId,
  copyFromVersionId,
}: NewVersionFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createVersionAction,
    initialState,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-surface-raised"
      >
        + New version
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-2 rounded-xl border border-border bg-surface p-3"
    >
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="copyFromVersionId" value={copyFromVersionId} />

      <p className="text-sm font-semibold text-foreground">New template version</p>
      <p className="text-xs text-muted">
        Copies the current version, then applies from the effective date onward.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Label</span>
          <input
            name="versionLabel"
            required
            placeholder="v2"
            className="h-9 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Effective from</span>
          <input
            type="date"
            name="effectiveFrom"
            required
            defaultValue={getManilaDateString()}
            className="h-9 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Notes (optional)</span>
        <input
          name="notes"
          placeholder="Why this version changed"
          className="h-9 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-accent"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create version"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted"
        >
          Cancel
        </button>
        {state.error ? <p className="text-xs text-red-300">{state.error}</p> : null}
      </div>
    </form>
  );
}
