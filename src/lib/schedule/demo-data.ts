import {
  formatShortDay,
  getManilaDateString,
  getManilaTomorrow,
} from "@/lib/schedule/datetime";
import type { DaySchedule, ScheduleEntry, TeamSchedule } from "@/lib/schedule/types";

interface DemoRow {
  id: string;
  scheduleDate: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  name: string;
  isOff: boolean;
  isPartTime: boolean;
  source: "template" | "manual";
  segments: { timeIn: string; timeOut: string }[];
}

const TEAMS = [
  { id: "kitchen", name: "Kitchen", slug: "kitchen" },
  { id: "dining", name: "Dining", slug: "dining" },
  { id: "ojt", name: "OJT", slug: "ojt" },
] as const;

function buildDemoRows(): DemoRow[] {
  const today = getManilaDateString();
  const tomorrow = getManilaTomorrow();

  return [
    {
      id: "1",
      scheduleDate: today,
      teamId: "kitchen",
      teamName: "Kitchen",
      teamSlug: "kitchen",
      name: "Michael Arcenas",
      isOff: false,
      isPartTime: false,
      source: "manual",
      segments: [{ timeIn: "09:00", timeOut: "20:00" }],
    },
    {
      id: "2",
      scheduleDate: today,
      teamId: "kitchen",
      teamName: "Kitchen",
      teamSlug: "kitchen",
      name: "Jello Lacia",
      isOff: false,
      isPartTime: false,
      source: "manual",
      segments: [
        { timeIn: "09:00", timeOut: "14:00" },
        { timeIn: "17:30", timeOut: "22:30" },
      ],
    },
    {
      id: "3",
      scheduleDate: today,
      teamId: "kitchen",
      teamName: "Kitchen",
      teamSlug: "kitchen",
      name: "Rico Daculo",
      isOff: true,
      isPartTime: false,
      source: "manual",
      segments: [],
    },
    {
      id: "4",
      scheduleDate: tomorrow,
      teamId: "kitchen",
      teamName: "Kitchen",
      teamSlug: "kitchen",
      name: "Michael Arcenas",
      isOff: false,
      isPartTime: false,
      source: "template",
      segments: [{ timeIn: "09:00", timeOut: "20:00" }],
    },
    {
      id: "5",
      scheduleDate: tomorrow,
      teamId: "kitchen",
      teamName: "Kitchen",
      teamSlug: "kitchen",
      name: "Jello Lacia",
      isOff: false,
      isPartTime: false,
      source: "template",
      segments: [
        { timeIn: "09:30", timeOut: "13:30" },
        { timeIn: "17:30", timeOut: "22:30" },
      ],
    },
    {
      id: "6",
      scheduleDate: tomorrow,
      teamId: "kitchen",
      teamName: "Kitchen",
      teamSlug: "kitchen",
      name: "Mikko Celada",
      isOff: true,
      isPartTime: false,
      source: "template",
      segments: [],
    },
    {
      id: "7",
      scheduleDate: tomorrow,
      teamId: "kitchen",
      teamName: "Kitchen",
      teamSlug: "kitchen",
      name: "Marco",
      isOff: false,
      isPartTime: true,
      source: "manual",
      segments: [{ timeIn: "12:00", timeOut: "16:00" }],
    },
    {
      id: "8",
      scheduleDate: today,
      teamId: "dining",
      teamName: "Dining",
      teamSlug: "dining",
      name: "Carlos Mendoza",
      isOff: false,
      isPartTime: false,
      source: "manual",
      segments: [{ timeIn: "10:00", timeOut: "19:00" }],
    },
    {
      id: "9",
      scheduleDate: today,
      teamId: "dining",
      teamName: "Dining",
      teamSlug: "dining",
      name: "Sofia Torres",
      isOff: false,
      isPartTime: false,
      source: "manual",
      segments: [{ timeIn: "11:00", timeOut: "20:00" }],
    },
    {
      id: "10",
      scheduleDate: tomorrow,
      teamId: "dining",
      teamName: "Dining",
      teamSlug: "dining",
      name: "Carlos Mendoza",
      isOff: false,
      isPartTime: false,
      source: "template",
      segments: [{ timeIn: "10:00", timeOut: "19:00" }],
    },
    {
      id: "11",
      scheduleDate: tomorrow,
      teamId: "dining",
      teamName: "Dining",
      teamSlug: "dining",
      name: "Diego Ramos",
      isOff: false,
      isPartTime: false,
      source: "template",
      segments: [{ timeIn: "09:00", timeOut: "18:00" }],
    },
    {
      id: "12",
      scheduleDate: tomorrow,
      teamId: "ojt",
      teamName: "OJT",
      teamSlug: "ojt",
      name: "Jenny Cruz",
      isOff: false,
      isPartTime: false,
      source: "template",
      segments: [{ timeIn: "08:00", timeOut: "17:00" }],
    },
    {
      id: "13",
      scheduleDate: tomorrow,
      teamId: "ojt",
      teamName: "OJT",
      teamSlug: "ojt",
      name: "Mark Villanueva",
      isOff: false,
      isPartTime: false,
      source: "template",
      segments: [{ timeIn: "09:00", timeOut: "18:00" }],
    },
  ];
}

function groupRows(rows: DemoRow[], date: string, teamFilter: string): DaySchedule {
  const filtered = rows.filter((row) => {
    if (row.scheduleDate !== date) return false;
    if (teamFilter !== "all" && row.teamSlug !== teamFilter) return false;
    return true;
  });

  const teamMap = new Map<string, TeamSchedule>();

  for (const team of TEAMS) {
    if (teamFilter !== "all" && team.slug !== teamFilter) continue;
    teamMap.set(team.slug, {
      id: team.id,
      name: team.name,
      slug: team.slug,
      entries: [],
    });
  }

  for (const row of filtered) {
    const team = teamMap.get(row.teamSlug);
    if (!team) continue;

    const entry: ScheduleEntry = {
      id: row.id,
      name: row.name,
      isOff: row.isOff,
      isPartTime: row.isPartTime,
      segments: row.segments,
      source: row.source,
    };

    team.entries.push(entry);
  }

  const teams = Array.from(teamMap.values()).filter((team) => team.entries.length > 0);

  return {
    date,
    dayLabel: formatShortDay(date),
    teams,
  };
}

export function getDemoSchedule(date: string, teamFilter: string): DaySchedule {
  return groupRows(buildDemoRows(), date, teamFilter);
}

export function getDemoTeams() {
  return [{ name: "All teams", slug: "all" }, ...TEAMS.map((t) => ({ name: t.name, slug: t.slug }))];
}
