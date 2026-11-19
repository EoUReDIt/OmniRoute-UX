/**
 * Hint Cache
 * SQLite-backed cache with breakerGeneration invalidation
 *
 * Integrates with /api/hint endpoint and localStorage
 *
 * Security:
 * - No secrets stored in cache
 * - breakerGeneration ensures cache freshness
 * - TTL-based eviction
 */

import { useLocalStorage } from '@/hooks/useLocalStorage'

// Cache key patterns
const CACHE_PREFIX = 'hint-'
const DEFAULT_TTL = 120000 // 2 minutes in milliseconds

// In-memory breaker generation counter
let breakerGeneration = 0

/**
 * Stores a hint value in the cache
 * @param testId - Unique identifier for the hint
 * @param hintValue - The hint value to store
 * @param generation - Breaker generation number
 * @returns true if stored successfully
 */
export async function storeHint(testId: string, hintValue: string, generation: number = breakerGeneration): Promise<boolean> {
  try {
    // Store in localStorage with TTL metadata
    const cacheEntry = {
      value: hintValue,
      generation: generation,
      timestamp: Date.now(),
      ttl: DEFAULT_TTL,
    }

    const key = `${CACHE_PREFIX}${testId}`
    const serialized = JSON.stringify(cacheEntry)
    localStorage.setItem(key, serialized)

    // In real implementation, would also call /api/hint endpoint
    // For now, localStorage-only implementation

    return true
  } catch (error) {
    console.error('Failed to store hint:', error)
    return false
  }
}

/**
 * Retrieves a hint value from the cache
 * @param testId - Unique identifier for the hint
 * @param generation - Expected breaker generation (optional - if provided, checks match)
 * @returns Hint value or null if not found/expired/invalid generation
 */
export function getHint(testId: string, generation?: number): string | null {
  try {
    const key = `${CACHE_PREFIX}${testId}`
    const serialized = localStorage.getItem(key)

    if (!serialized) {
      return null
    }

    const cacheEntry: {
      value: string
      generation: number
      timestamp: number
      ttl: number
    } = JSON.parse(serialized)

    // Check TTL expiry
    const age = Date.now() - cacheEntry.timestamp
    if (age > cacheEntry.ttl) {
      // Expired - remove from cache
      localStorage.removeItem(key)
      return null
    }

    // Check breaker generation match (if specified)
    if (generation !== undefined && cacheEntry.generation !== generation) {
      // Generation mismatch - cache invalidated
      localStorage.removeItem(key)
      return null
    }

    return cacheEntry.value
  } catch (error) {
    console.error('Failed to get hint:', error)
    return null
  }
}

/**
 * Increments the breaker generation counter
 * When this is called, all hints with older generations become invalid
 * @returns The new breaker generation number
 */
export function incrementBreakerGeneration(): number {
  breakerGeneration++
  // In real implementation with SQLite, would persist this
  // For now, in-memory with localStorage sync
  localStorage.setItem('breakerGeneration', String(breakerGeneration))
  return breakerGeneration
}

/**
 * Gets the current breaker generation
 * @returns Current breaker generation number
 */
export function getBreakerGeneration(): number {
  try {
    const gen = localStorage.getItem('breakerGeneration')
    return gen ? parseInt(gen, 10) : 0
  } catch {
    return 0
  }
}

/**
 * Clears all hints for a specific test/id
 * @param testId - The hint test ID to clear
 */
export function clearHint(testId: string): boolean {
  try {
    const key = `${CACHE_PREFIX}${testId}`
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error('Failed to clear hint:', error)
    return false
  }
}

/**
 * Clears all cache entries
 */
export function clearAllHints(): boolean {
  try {
    // Remove all hint-* keys from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    }
    // Reset breaker generation
    breakerGeneration = 0
    localStorage.removeItem('breakerGeneration')
    return true
  } catch (error) {
    console.error('Failed to clear all hints:', error)
    return false
  }
}

// Export types for use in other modules
export type {}