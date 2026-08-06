/**
 * lib/printful/logger.ts
 *
 * Structured Logging Utility for Printful Operations.
 */

export interface PrintfulLogEntry {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

export const printfulLogger = {
  info(message: string, context?: Record<string, unknown>) {
    console.info(`[printful] ${message}`, context ? JSON.stringify(context) : "");
  },

  warn(message: string, context?: Record<string, unknown>) {
    console.warn(`[printful-warning] ${message}`, context ? JSON.stringify(context) : "");
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    console.error(
      `[printful-error] ${message}`,
      error instanceof Error ? error.message : String(error),
      context ? JSON.stringify(context) : ""
    );
  },

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[printful-debug] ${message}`, context ? JSON.stringify(context) : "");
    }
  },
};
