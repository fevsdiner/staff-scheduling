"use client";

import { useActionState } from "react";

import { loginAction, type LoginState } from "@/lib/auth/actions";

const initialState: LoginState = {};

interface LoginFormProps {
  nextPath: string;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="next" value={nextPath} />

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">Username</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          required
          className="h-11 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-lg border border-border bg-surface-raised px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </label>

      {state.error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center rounded-lg bg-accent text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
