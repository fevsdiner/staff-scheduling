import type { AuthUser } from "@/lib/auth/types";
import { teamBySlug, type TeamOption } from "@/lib/employees/types";

export function resolveAdminTeamFilter(
  user: AuthUser,
  teams: TeamOption[],
  teamParam?: string,
  options?: { allowAllTeams?: boolean },
): {
  selectedTeamSlug: string;
  defaultTeamSlug: string;
  showAllTeams: boolean;
  selectedTeam: TeamOption | null;
} {
  const allowAllTeams = options?.allowAllTeams === true && user.role === "manager";
  const defaultTeamSlug = allowAllTeams ? "all" : teams[0].slug;

  if (allowAllTeams) {
    if (!teamParam || teamParam === "all") {
      return {
        selectedTeamSlug: "all",
        defaultTeamSlug,
        showAllTeams: true,
        selectedTeam: null,
      };
    }

    const requestedTeam = teamBySlug(teamParam);
    if (requestedTeam && teams.some((team) => team.id === requestedTeam.id)) {
      return {
        selectedTeamSlug: requestedTeam.slug,
        defaultTeamSlug,
        showAllTeams: true,
        selectedTeam: requestedTeam,
      };
    }

    return {
      selectedTeamSlug: "all",
      defaultTeamSlug,
      showAllTeams: true,
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
    showAllTeams: false,
    selectedTeam,
  };
}
