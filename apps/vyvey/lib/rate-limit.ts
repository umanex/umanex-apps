// Lichte in-memory IP rate-limiter voor /api/contact — geen externe dep of infra.
// Werkt per serverless-instance; voor sterkere (gedeelde) garanties: vervang door
// Upstash @upstash/ratelimit + @upstash/redis.

type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000; // 1 minuut
const MAX_REQUESTS = 5; // per IP per window
const buckets = new Map<string, Bucket>();

export const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
};

type Result = { ok: true } | { ok: false; retryAfterSeconds: number };

export const rateLimit = (key: string): Result => {
  const now = Date.now();

  // Lazy opschonen tegen onbegrensde groei van de Map.
  if (buckets.size > 1000) {
    for (const [k, b] of buckets) {
      if (now > b.resetAt) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= MAX_REQUESTS) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
};
