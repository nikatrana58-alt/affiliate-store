/**
 * lib/security/rate-limit.ts
 *
 * In-memory sliding window rate limiter for API security & DDoS protection.
 */

type RateLimitOptions = {
  windowMs?: number; // Time window in milliseconds (default: 60,000ms = 1 min)
  maxRequests?: number; // Max requests per IP in window (default: 60)
};

const tracker = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { success: boolean; remaining: number; resetMs: number } {
  const windowMs = options.windowMs ?? 60000;
  const maxRequests = options.maxRequests ?? 60;
  const now = Date.now();

  const record = tracker.get(identifier);

  if (!record || now > record.expiresAt) {
    tracker.set(identifier, { count: 1, expiresAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1, resetMs: windowMs };
  }

  if (record.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetMs: record.expiresAt - now,
    };
  }

  record.count += 1;
  return {
    success: true,
    remaining: maxRequests - record.count,
    resetMs: record.expiresAt - now,
  };
}
