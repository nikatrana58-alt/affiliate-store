/**
 * lib/logging/unified-logger.ts
 *
 * Unified Logging System for Import, Sync, Order, and API Events.
 */

import fs from "fs";
import path from "path";

export type LogCategory = "import" | "sync" | "order" | "api";
export type LogLevel = "info" | "warn" | "error";

export interface UnifiedLogEntry {
  id: string;
  category: LogCategory;
  level: LogLevel;
  action: string;
  supplier?: "CJ" | "PRINTFUL" | "SYSTEM";
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const UNIFIED_LOGS_FILE = path.join(process.cwd(), "data", "unified-logs.json");

function ensureDataDirExists() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getUnifiedLogs(category?: LogCategory, limit = 100): UnifiedLogEntry[] {
  ensureDataDirExists();
  if (!fs.existsSync(UNIFIED_LOGS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(UNIFIED_LOGS_FILE, "utf-8");
    const logs: UnifiedLogEntry[] = JSON.parse(raw);
    const filtered = category ? logs.filter((l) => l.category === category) : logs;
    return filtered.slice(-limit).reverse();
  } catch (err) {
    console.error("[unified-logger] Error reading unified log file:", err);
    return [];
  }
}

export function recordUnifiedLog(
  category: LogCategory,
  action: string,
  message: string,
  options: {
    level?: LogLevel;
    supplier?: "CJ" | "PRINTFUL" | "SYSTEM";
    metadata?: Record<string, unknown>;
  } = {}
): UnifiedLogEntry {
  ensureDataDirExists();

  const entry: UnifiedLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    category,
    level: options.level || "info",
    action,
    supplier: options.supplier || "SYSTEM",
    message,
    metadata: options.metadata,
    timestamp: new Date().toISOString(),
  };

  const consoleFn =
    entry.level === "error"
      ? console.error
      : entry.level === "warn"
      ? console.warn
      : console.info;

  consoleFn(`[${entry.category.toUpperCase()}][${entry.supplier}] ${action}: ${message}`);

  try {
    let logs: UnifiedLogEntry[] = [];
    if (fs.existsSync(UNIFIED_LOGS_FILE)) {
      const raw = fs.readFileSync(UNIFIED_LOGS_FILE, "utf-8");
      logs = JSON.parse(raw);
    }
    logs.push(entry);
    if (logs.length > 500) {
      logs = logs.slice(-500);
    }
    fs.writeFileSync(UNIFIED_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("[unified-logger] Error writing to log file:", err);
  }

  return entry;
}
