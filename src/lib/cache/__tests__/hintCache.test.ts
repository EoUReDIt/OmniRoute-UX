/**
 * Routing Hint Cache Unit Tests
 * SQLite cache with breakerGeneration invalidation
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { storeHint, getHint, incrementBreakerGeneration } from '@/lib/cache/hintCache'

describe('Routing Hint Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stores hint with connectionId and generation', async () => {
    await storeHint('conn-1', 'test-hint', 1)
    const hint = await getHint('conn-1', 1)
    expect(hint).toBe('test-hint')
  })

  it('retrieves hint with matching generation', async () => {
    await storeHint('conn-2', 'hint-2', 5)
    const hint = await getHint('conn-2', 5)
    expect(hint).toBe('hint-2')
  })

  it('returns null when generation mismatches', async () => {
    await storeHint('conn-3', 'hint-3', 1)
    const hint = await getHint('conn-3', 2)
    expect(hint).toBeNull()
  })

  it('returns null for non-existent connection', async () => {
    const hint = await getHint('non-existent', 1)
    expect(hint).toBeNull()
  })

  it('increments breaker generation and evicts all hints', async () => {
    await storeHint('conn-4', 'hint-4', 1)
    await storeHint('conn-5', 'hint-5', 1)
    
    incrementBreakerGeneration()
    
    const hint1 = await getHint('conn-4', 1)
    const hint2 = await getHint('conn-5', 1)
    expect(hint1).toBeNull()
    expect(hint2).toBeNull()
  })

  it('handles multiple generations correctly', async () => {
    await storeHint('conn-6', 'gen-1', 1)
    await storeHint('conn-6', 'gen-2', 2)
    await storeHint('conn-6', 'gen-3', 3)
    
    expect(await getHint('conn-6', 1)).toBe('gen-1')
    expect(await getHint('conn-6', 2)).toBe('gen-2')
    expect(await getHint('conn-6', 3)).toBe('gen-3')
  })
})