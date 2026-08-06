/**
 * lib/resilience/circuit-breaker.ts
 *
 * Production Circuit Breaker & Resilient Fault Tolerance Helper.
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Failures before opening circuit
  resetTimeoutMs?: number;   // Time in open state before testing half-open
  timeoutMs?: number;        // Request timeout
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private failureThreshold: number;
  private resetTimeoutMs: number;
  private timeoutMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async execute<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === "OPEN") {
      if (now - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        console.info("[circuit-breaker] Circuit transition: OPEN -> HALF_OPEN. Testing supplier health...");
      } else {
        throw new Error("[circuit-breaker] Supplier API circuit is OPEN due to recent consecutive failures. Fast failing.");
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timeoutId);

      if (this.state === "HALF_OPEN") {
        this.state = "CLOSED";
        this.failureCount = 0;
        console.info("[circuit-breaker] Circuit transition: HALF_OPEN -> CLOSED. Supplier API healthy.");
      }

      return result;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = "OPEN";
        console.warn(
          `[circuit-breaker] Failure threshold reached (${this.failureCount}/${this.failureThreshold}). Circuit transition -> OPEN.`
        );
      }

      throw err;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
