import { tooMany } from "./errors";

/**
 * Fixed-window in-memory rate limiter. Good for a single Node instance; for
 * multiple instances replace the store with Redis (same interface).
 */
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweep(now);
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw tooMany();
}

export function resetRateLimit(key: string) {
  store.delete(key);
}

export const LIMITS = {
  login: { limit: 8, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  order: { limit: 10, windowMs: 10 * 60_000 },
  coupon: { limit: 20, windowMs: 10 * 60_000 },
  contact: { limit: 5, windowMs: 60 * 60_000 },
  track: { limit: 15, windowMs: 15 * 60_000 },
  upload: { limit: 120, windowMs: 10 * 60_000 },
  review: { limit: 10, windowMs: 60 * 60_000 },
  password: { limit: 6, windowMs: 15 * 60_000 },
} as const;
