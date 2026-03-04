// Simple in-memory rate limiter per function invocation window
// For production, use a DB-backed approach
const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxRequests = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false; // not limited
  }
  entry.count++;
  if (entry.count > maxRequests) return true; // limited
  return false;
}
