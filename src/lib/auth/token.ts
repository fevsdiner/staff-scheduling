import type { AuthUser, SessionPayload } from "@/lib/auth/types";

export const SESSION_COOKIE = "fevs_session";
const SESSION_DAYS = 7;

function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "fevs-local-dev-secret-change-me";
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(padLength));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function verify(payload: string, signature: string): Promise<boolean> {
  const expected = await sign(payload);
  if (expected.length !== signature.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export function getSessionMaxAgeSeconds(): number {
  return SESSION_DAYS * 24 * 60 * 60;
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + getSessionMaxAgeSeconds() * 1000,
  };
  const encoded = encodeBase64Url(JSON.stringify(payload));
  const signature = await sign(encoded);
  return `${encoded}.${signature}`;
}

export async function readSessionToken(token: string): Promise<AuthUser | null> {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const valid = await verify(encoded, signature);
  if (!valid) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(encoded)) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    const legacy = payload as SessionPayload & { email?: string };
    const username =
      legacy.username ??
      (typeof legacy.email === "string" ? legacy.email.split("@")[0] : undefined);
    if (!payload.id || !username || !payload.role) return null;

    return {
      id: payload.id,
      username,
      name: payload.name,
      role: payload.role,
      teamSlugs: payload.teamSlugs ?? [],
    };
  } catch {
    return null;
  }
}

export async function hasValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return Boolean(await readSessionToken(token));
}
