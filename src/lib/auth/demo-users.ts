import type { AuthUser } from "@/lib/auth/types";

interface DemoAccount extends AuthUser {
  password: string;
}

/** Local-only test accounts. Replace with Supabase Auth in a later step. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "demo-manager",
    username: "manager",
    password: "1234",
    name: "Manager",
    role: "manager",
    teamSlugs: ["kitchen", "dining", "ojt"],
  },
  {
    id: "demo-kitchen",
    username: "kitchen",
    password: "1234",
    name: "Kitchen Supervisor",
    role: "supervisor",
    teamSlugs: ["kitchen"],
  },
  {
    id: "demo-dining",
    username: "dining",
    password: "1234",
    name: "Dining Supervisor",
    role: "supervisor",
    teamSlugs: ["dining", "ojt"],
  },
];

export function findDemoAccount(
  username: string,
  password: string,
): AuthUser | null {
  const account = DEMO_ACCOUNTS.find(
    (entry) =>
      entry.username.toLowerCase() === username.trim().toLowerCase() &&
      entry.password === password,
  );

  if (!account) return null;

  const { password: _password, ...user } = account;
  return user;
}
