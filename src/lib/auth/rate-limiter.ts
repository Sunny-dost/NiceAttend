interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory sliding window store
const attemptsStore = new Map<string, AttemptRecord>();

// Periodic cleanup every 10 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    attemptsStore.forEach((record, key) => {
      if (now - record.firstAttemptAt > WINDOW_MS) {
        attemptsStore.delete(key);
      }
    });
  }, 10 * 60 * 1000);
}

export interface RateLimitCheckResult {
  isBlocked: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
}

/**
 * Check if an identifier (IP address or username) is currently rate limited.
 */
export function checkRateLimit(identifier: string): RateLimitCheckResult {
  const now = Date.now();
  const record = attemptsStore.get(identifier);

  if (!record) {
    return { isBlocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  // If window has passed, reset
  if (now - record.firstAttemptAt > WINDOW_MS) {
    attemptsStore.delete(identifier);
    return { isBlocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.firstAttemptAt + WINDOW_MS - now) / 1000);
    return {
      isBlocked: true,
      remainingAttempts: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  return {
    isBlocked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - record.count,
  };
}

/**
 * Record a failed login attempt for an identifier.
 */
export function recordFailedAttempt(identifier: string): RateLimitCheckResult {
  const now = Date.now();
  const record = attemptsStore.get(identifier);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    attemptsStore.set(identifier, {
      count: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
    });
    return { isBlocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - 1 };
  }

  record.count += 1;
  record.lastAttemptAt = now;

  const isBlocked = record.count >= MAX_FAILED_ATTEMPTS;
  const retryAfterSeconds = isBlocked
    ? Math.ceil((record.firstAttemptAt + WINDOW_MS - now) / 1000)
    : undefined;

  return {
    isBlocked,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - record.count),
    retryAfterSeconds,
  };
}

/**
 * Reset rate limit counter upon successful authentication.
 */
export function resetRateLimit(identifier: string): void {
  attemptsStore.delete(identifier);
}

/**
 * For testing purposes: clear all stored attempts.
 */
export function clearRateLimiter(): void {
  attemptsStore.clear();
}
