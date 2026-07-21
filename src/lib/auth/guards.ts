import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import type { AuthUser, UserRole } from "@/lib/auth/types";

export async function requireUser(redirectTo = "/login"): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(redirectTo);
  }
  return user;
}

export async function requireRole(
  roles: UserRole[],
  redirectTo = "/admin",
): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(redirectTo);
  }
  return user;
}
