import { createHash } from "crypto";

/** Stable id for template rows not yet in the DB — same on every read for a given day/employee. */
export function stableDailyEntryId(
  teamId: string,
  date: string,
  employeeId: string,
): string {
  const hash = createHash("sha256")
    .update(`${teamId}:${date}:${employeeId}`)
    .digest("hex");

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}
