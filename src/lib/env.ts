/** Trim whitespace and surrounding quotes from Vercel / .env pasted values. */
export function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;

  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value || undefined;
}

/** Vercel serverless has a read-only filesystem except /tmp. */
export function canUseFileDataStore(): boolean {
  return !process.env.VERCEL;
}
