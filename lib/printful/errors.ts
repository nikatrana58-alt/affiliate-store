/**
 * lib/printful/errors.ts
 *
 * Production-grade custom error classes for Printful integration.
 */

export class PrintfulError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintfulError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PrintfulAPIError extends PrintfulError {
  public readonly statusCode: number;
  public readonly reason?: string;
  public readonly endpoint?: string;
  public readonly responseBody?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    reason?: string,
    endpoint?: string,
    responseBody?: unknown
  ) {
    super(message);
    this.name = "PrintfulAPIError";
    this.statusCode = statusCode;
    this.reason = reason;
    this.endpoint = endpoint;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PrintfulRateLimitError extends PrintfulAPIError {
  public readonly retryAfterMs: number;

  constructor(
    message: string = "Printful API rate limit exceeded.",
    retryAfterMs: number = 2000,
    endpoint?: string
  ) {
    super(message, 429, "Rate limit exceeded", endpoint);
    this.name = "PrintfulRateLimitError";
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PrintfulValidationError extends PrintfulError {
  public readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = "PrintfulValidationError";
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PrintfulAuthError extends PrintfulAPIError {
  constructor(message: string = "Invalid or missing Printful API token.", endpoint?: string) {
    super(message, 401, "Authentication failed", endpoint);
    this.name = "PrintfulAuthError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
