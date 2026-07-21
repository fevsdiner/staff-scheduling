import type { AuthUser } from "@/lib/auth/types";
import { TEAM_OPTIONS, type TeamOption } from "@/lib/employees/types";

export function accessibleTeams(user: AuthUser): TeamOption[] {
  if (user.role === "manager") {
    return TEAM_OPTIONS;
  }

  return TEAM_OPTIONS.filter((team) => user.teamSlugs.includes(team.slug));
}

export function getRoleTitle(user: AuthUser): string {
  if (user.role === "manager") {
    return "Manager";
  }

  if (user.username === "kitchen") {
    return "Kitchen Supervisor";
  }

  if (user.username === "dining") {
    return "Dining Supervisor";
  }

  return user.name;
}
