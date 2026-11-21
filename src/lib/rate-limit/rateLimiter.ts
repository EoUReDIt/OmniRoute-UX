/**
 * Rate limiter with per-user and per-IP tracking.
 * 
 * Security gates:
 * - Per-user: 10 requests/minute (keyPrefix: settings-user)
 * - Per-IP: 5 requests/minute (keyPrefix: settings-ip)
 * - Headers: X-RateLimit-Remaining, X-RateLimit-Reset
 * - 429 with Retry-After header on limit exceeded
 */

import { getDbInstance } from "@/lib/db/core";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export class RateLimiter {
  private windowMs: number;
  private max: number;
  private keyPrefix: string;

  constructor(config: { windowMs: number; max: number; keyPrefix: string }) {
    this.windowMs = config.windowMs;
    this.max = config.max;
    this.keyPrefix = config.keyPrefix;
    this.initTable();
  }

  private initTable(): void {
    const db = getDbInstance();
    db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limit_${this.keyPrefix} (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 1,
        reset_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rate_limit_${this.keyPrefix}_reset ON rate_limit_${this.keyPrefix}(reset_at);
    `);
  }

  private getKey(identifier: string): string {
    return `${this.keyPrefix}:${identifier}`;
  }

  private cleanExpired(): void {
    const db = getDbInstance();
    const now = Date.now();
    db.prepare(`DELETE FROM rate_limit_${this.keyPrefix} WHERE reset_at < ?`).run(now);
  }

  // Check rate limit against a Request object
  // Returns { exceeded, retryAfter, remaining, resetTime }
  async check(request: Request): Promise<{ exceeded: boolean; retryAfter: number; remaining: number; resetTime: number }> {
    const identifier = getClientIP(request)
    const result = await this.consume(identifier)
    return {
      exceeded: !result.allowed,
      retryAfter: result.retryAfter || 0,
      remaining: result.remaining,
      resetTime: result.resetAt,
    }
  }

  async consume(identifier: string): Promise<RateLimitResult> {
    this.cleanExpired();

    const db = getDbInstance();
    const key = this.getKey(identifier);
    const now = Date.now();
    const resetAt = now + 60_000; // 60 second window

    // Get current count
    const row = db.prepare(`
      SELECT count, reset_at FROM rate_limit_${this.keyPrefix} WHERE key = ?
    `).get(this.getKey(identifier)) as RateLimitRecord | undefined;

    let count = 1;
    let resetAtVal = resetAt;

    if (row) {
      if (now < row.resetAt) {
        count = row.count + 1;
      } else {
        // Window expired, reset
        count = 1;
      }
      resetAtVal = row.resetAt;
    }

    if (count > this.max) {
      const retryAfter = Math.ceil((row?.resetAt || resetAtVal - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: row?.resetAt || resetAtVal,
        retryAfter,
      };
    }

    // Increment or insert
    if (row) {
      db.prepare(`
        UPDATE rate_limit_${this.keyPrefix} SET count = ?, reset_at = ? WHERE key = ?
      `).run(count, resetAtVal, this.getKey(identifier));
    } else {
      db.prepare(`
        INSERT INTO rate_limit_${this.keyPrefix} (key, count, reset_at) VALUES (?, ?, ?)
      `).run(this.getKey(identifier), count, resetAtVal);
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.max - count),
      resetAt: resetAtVal,
    };
  }
}

// Export singleton instances
export const userRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 10,
  keyPrefix: "settings-user",
});

export const ipRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 5,
  keyPrefix: "settings-ip",
});

// Helper to get client IP from request
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;
  return "unknown";
}

// Helper to get user identifier from request (for authenticated requests)
export async function getUserIdentifier(request: Request): Promise<string> {
  // Try to get user from session/auth context
  // For now, use a simple approach - in real implementation would use session
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    return `user:${authHeader.slice(0, 20)}`; // Truncated for privacy
  }
  return `anon:${await getClientIP(request)}`;
}

// Middleware factory for rate limiting
export async function rateLimitMiddleware(
  request: Request,
  userLimiter: typeof userRateLimiter = userRateLimiter,
  ipLimiter: typeof ipRateLimiter = ipRateLimiter
): Promise<{ response: Response | null; headers: Record<string, string> }> {
  const userId = await getUserIdentifier(request);
  const clientIP = getClientIP(request);

  // Check user rate limit
  const userResult = await userLimiter.consume(userId);
  // Check IP rate limit
  const ipResult = await ipLimiter.consume(clientIP);

  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(Math.min(userResult.remaining, ipResult.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(Math.max(userResult.resetAt, ipResult.resetAt) / 1000)),
  };

  // If either limit exceeded, return 429
  if (!userResult.allowed || !ipResult.allowed) {
    const retryAfter = Math.max(userResult.retryAfter || 0, ipResult.retryAfter || 0);
    headers["Retry-After"] = String(retryAfter);
    headers["X-RateLimit-Limit"] = "10"; // User limit
    
    return {
      response: new Response(JSON.stringify({
        error: "Rate limit exceeded",
        retryAfter,
      }), {
        status: 429,
        headers,
      }),
      headers,
    };
  }

  return { response: null, headers };
}
