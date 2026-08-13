export type TeamSlug = "kitchen" | "dining" | "ojt";

export type EmploymentType = "regular" | "part_time";

export interface TeamOption {
  id: string;
  name: string;
  slug: TeamSlug;
}

export interface Employee {
  id: string;
  name: string;
  teamId: string;
  teamSlug: TeamSlug;
  teamName: string;
  employmentType: EmploymentType;
  birthday: string | null;
  active: boolean;
  createdAt: string;
}

export const TEAM_OPTIONS: TeamOption[] = [
  {
    id: "11111111-1111-1111-1111-111111111101",
    name: "Kitchen",
    slug: "kitchen",
  },
  {
    id: "11111111-1111-1111-1111-111111111102",
    name: "Dining",
    slug: "dining",
  },
  {
    id: "11111111-1111-1111-1111-111111111103",
    name: "OJT",
    slug: "ojt",
  },
];

export function teamBySlug(slug: string): TeamOption | undefined {
  return TEAM_OPTIONS.find((team) => team.slug === slug);
}

export function teamById(id: string): TeamOption | undefined {
  return TEAM_OPTIONS.find((team) => team.id === id);
}

export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] =
  [
    { value: "regular", label: "Regular" },
    { value: "part_time", label: "Part-Time" },
  ];

export function employmentTypeLabel(type: EmploymentType): string {
  return (
    EMPLOYMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    "Regular"
  );
}
