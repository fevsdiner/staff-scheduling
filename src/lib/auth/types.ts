export type UserRole = "manager" | "supervisor";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  /** Team slugs this user can manage. Managers get all teams. */
  teamSlugs: string[];
}

export interface SessionPayload extends AuthUser {
  exp: number;
}
