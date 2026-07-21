"use client";

export default function DailyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
      <h2 className="text-sm font-semibold text-red-200">Could not load daily schedule</h2>
      <p className="text-xs text-red-100/90">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-500/20"
      >
        Try again
      </button>
    </div>
  );
}
