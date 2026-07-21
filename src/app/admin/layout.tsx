import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

import { getRoleTitle } from "@/lib/auth/teams";
import { logoutAction } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/guards";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 py-3 sm:px-5">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <BrandLogo width={160} height={80} className="h-9 w-auto shrink-0" />
            <div className="min-w-0 border-l border-border pl-3">
              <p className="truncate text-sm font-semibold text-foreground">
                {getRoleTitle(user)}
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-raised"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-6">{children}</div>
    </div>
  );
}
