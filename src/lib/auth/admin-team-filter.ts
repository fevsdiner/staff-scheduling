import type { AuthUser } from "@/lib/auth/types";
import { teamBySlug, type TeamOption } from "@/lib/employees/types";

export function resolveAdminTeamFilter(
  user: AuthUser,
  teams: TeamOption[],
  teamParam?: string,
): {
  selectedTeamSlug: string;
  defaultTeamSlug: string;
  showAllTeams: boolean;
  selectedTeam: TeamOption | null;
} {
  const showAllTeams = user.role === "manager";
  const defaultTeamSlug = showAllTeams ? "all" : teams[0].slug;

  if (showAllTeams && teamParam === "all") {
    return {
      selectedTeamSlug: "all",
      defaultTeamSlug,
      showAllTeams,
      selectedTeam: null,
    };
  }

  const requestedTeam = teamParam ? teamBySlug(teamParam) : undefined;
  const selectedTeam =
    requestedTeam && teams.some((team) => team.id === requestedTeam.id)
      ? requestedTeam
      : teams[0];

  return {
    selectedTeamSlug: selectedTeam.slug,
    defaultTeamSlug,
    showAllTeams,
    selectedTeam,
  };
}
