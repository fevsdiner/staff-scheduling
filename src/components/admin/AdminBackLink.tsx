import Link from "next/link";

export const accentButtonClassName =
  "inline-flex items-center justify-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110";

export function AdminBackLink() {
  return (
    <Link href="/admin" className={`${accentButtonClassName} shrink-0`}>
      ← Back
    </Link>
  );
}
