import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";
import { Suspense } from "react";

import { PublicScheduleView } from "@/components/schedule/PublicScheduleView";
import { ScheduleFilters } from "@/components/schedule/ScheduleFilters";
import { getSessionUser } from "@/lib/auth/session";
import { getManilaTomorrow, isValidDateString } from "@/lib/schedule/datetime";
import {
  getScheduleForDate,
  getTeamOptions,
  isUsingDemoData,
} from "@/lib/schedule/queries";

interface HomeProps {
  searchParams: Promise<{ date?: string; team?: string }>;
}

function FiltersFallback() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="h-10 animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-10 animate-pulse rounded-lg bg-surface-raised" />
    </div>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const defaultDate = getManilaTomorrow();
  const selectedDate =
    params.date && isValidDateString(params.date) ? params.date : defaultDate;
  const selectedTeam = params.team ?? "all";

  const [schedule, teams, sessionUser] = await Promise.all([
    getScheduleForDate(selectedDate, selectedTeam),
    getTeamOptions(),
    getSessionUser(),
  ]);

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-3 py-4 sm:px-5 sm:py-6">
        <header className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <BrandLogo
                width={320}
                height={160}
                priority
                className="h-[4.5rem] w-auto sm:h-[5.5rem]"
              />
              <h1 className="border-l border-border pl-4 text-2xl font-semibold tracking-tight text-foreground sm:pl-5 sm:text-3xl">
                Staff Schedule
              </h1>
            </div>

            <Link
              href={sessionUser ? "/admin" : "/login"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
              aria-label={sessionUser ? "Admin settings" : "Admin login"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </Link>
          </div>

          {isUsingDemoData() ? (
            <p className="mt-3 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">
              Demo mode — sample data. Connect Supabase to use the database.
            </p>
          ) : null}
        </header>

        <section className="mb-3 rounded-xl border border-border bg-surface p-3">
          <Suspense fallback={<FiltersFallback />}>
            <ScheduleFilters
              selectedDate={selectedDate}
              selectedTeam={selectedTeam}
              teams={teams}
              defaultDate={defaultDate}
            />
          </Suspense>
        </section>

        <main>
          <PublicScheduleView schedule={schedule} />
        </main>
      </div>
    </div>
  );
}
