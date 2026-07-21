"use server";

import { redirect } from "next/navigation";

import { findDemoAccount } from "@/lib/auth/demo-users";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const user = findDemoAccount(username, password);
  if (!user) {
    return { error: "Invalid username or password." };
  }

  await setSessionCookie(user);

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  redirect(safeNext);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
