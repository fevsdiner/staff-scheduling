import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

import { LoginForm } from "@/components/auth/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/admin";

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLogo
            width={240}
            height={120}
            priority
            className="h-16 w-auto"
          />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Admin Login</h1>
            <p className="mt-1 text-sm text-muted">
              Managers and supervisors only.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <LoginForm nextPath={nextPath} />
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/" className="text-accent hover:underline">
            ← Back to public schedule
          </Link>
        </p>
      </div>
    </div>
  );
}
