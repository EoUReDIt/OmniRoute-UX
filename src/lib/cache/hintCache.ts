import { getDbInstance } from "@/lib/db/client";

/**
 * Hint cache with breaker generation invalidation.
 * 
 * Security gate: 🟠 HIGH — Circuit Breaker Integration
 * - breakerGeneration column increments on breaker open/close
 * - Cache eviction on read if generation mismatch
 * - TTL 120s enforced alongside breaker generation
 */

export interface HintCacheEntry {
  connectionId: string;
  hint: string;
  expiresAt: number;
  breakerGeneration: number;
}

let currentBreakerGeneration = 0;

/**
 * Get current breaker generation
 */
export function getBreakerGeneration(): number {
  return currentBreakerGeneration;
}

/**
 * Increment breaker generation (called when breaker opens/closes)
 * Evicts all cached hints by incrementing generation
 */
export function incrementBreakerGeneration(): void {
  currentBreakerGeneration++;
}

/**
 * Store hint with current breaker generation and TTL
 */
export async function storeHint(connectionId: string, hint: string, generation: number = currentBreakerGeneration): Promise<void> {
  const db = getDbInstance();
  const expiresAt = Date.now() + 120_000; // 120s TTL
  
  db.prepare(`
    INSERT OR REPLACE INTO hint_cache (connection_id, hint, expires_at, breaker_generation)
    VALUES (?, ?, ?, ?)
  `).run(connectionId, hint, expiresAt, generation);
}

/**
 * Get hint if not expired and generation matches
 * Returns null on:
 * - Cache miss
 * - TTL expired
 * - Breaker generation mismatch (auto-eviction)
 */
export async function getHint(connectionId: string, generation: number = currentBreakerGeneration): Promise<string | null> {
  const db = getDbInstance();
  const row = db.prepare(`
    SELECT hint, expires_at, breaker_generation
    FROM hint_cache
    WHERE connection_id = ?
  `).get(connectionId) as HintCacheEntry | undefined;
  
  if (!row) return null;
  
  // Check TTL
  if (Date.now() > row.expiresAt) {
    // Expired - delete
    db.prepare(`DELETE FROM hint_cache WHERE connection_id = ?`).run(connectionId);
    return null;
  }
  
  // Check breaker generation
  if (row.breakerGeneration !== generation) {
    // Generation mismatch - evict
    db.prepare(`DELETE FROM hint_cache WHERE connection_id = ?`).run(connectionId);
    return null;
  }
  
  return row.hint;
}

/**
 * Initialize hint cache table
 */
export function initHintCache(): void {
  const db = getDbInstance();
  db.exec(`
    CREATE TABLE IF NOT EXISTS hint_cache (
      connection_id TEXT PRIMARY KEY,
      hint TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      breaker_generation INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_hint_cache_expires ON hint_cache(expires_at);
  `);
}

/**
 * Clear all hints (called on breaker flip)
 */
export function clearAllHints(): void {
  const db = getDbInstance();
  db.prepare(`DELETE FROM hint_cache`).run();
  currentBreakerGeneration++;
}
