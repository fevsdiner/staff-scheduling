import { existsSync, mkdirSync } from "fs";
import path from "path";

import { canUseFileDataStore } from "@/lib/env";

export const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");

export function ensureLocalDataDir(): boolean {
  if (!canUseFileDataStore()) return false;

  try {
    if (!existsSync(LOCAL_DATA_DIR)) {
      mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}
