import Link from "next/link";

import { requireUser } from "@/lib/auth/guards";

const tools = [
  {
    href: "/admin/schedule",
    title: "Daily Schedule View",
    description:
      "See the live staff schedule — same as the home page, without leaving admin.",
    ready: true,
  },
  {
    href: "/admin/daily",
    title: "Daily Schedule Editor",
    description: "Edit tomorrow’s shifts for your team (default date).",
    ready: true,
  },
  {
    href: "/admin/template",
    title: "Weekly Template Editor",
    description: "Versioned week templates that auto-fill daily schedules.",
    ready: true,
  },
  {
    href: "/admin/employees",
    title: "Employees",
    description: "Manage the permanent roster (manager).",
    ready: true,
    managerOnly: true,
  },
] as const;

export default async function AdminHomePage() {
  const user = await requireUser();

  const links = tools.filter(
    (item) => !("managerOnly" in item && item.managerOnly) || user.role === "manager",
  );

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-surface p-4">
        <h1 className="text-lg font-semibold text-foreground">Welcome, {user.name}</h1>
        <p className="mt-3 text-sm text-muted">
          Teams you can manage:{" "}
          <span className="text-foreground">
            {user.teamSlugs.map((slug) => slug.toUpperCase()).join(", ")}
          </span>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Tools
        </h2>
        <div className="grid gap-2">
          {links.map((item) => (
            <div
              key={item.href}
              className="rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                </div>
                {item.ready ? (
                  <Link
                    href={item.href}
                    className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black"
                  >
                    Open
                  </Link>
                ) : (
                  <span className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs text-muted">
                    Soon
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
