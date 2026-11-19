import { describe, it, expect, beforeEach } from 'vitest'
import { HintCache } from '@/lib/cache/hintCache'

describe('Cache invalidation on breaker flip', () => {
  let cache: HintCache

  beforeEach(() => {
    cache = new HintCache()
  })

  it('breaker flip should increment breakerGeneration', () => {
    const initialGen = cache.getBreakerGeneration()
    cache.openBreaker()
    const newGen = cache.getBreakerGeneration()
    expect(newGen).toBe(initialGen + 1)
  })

  it('cache read with generation mismatch should evict hints', () => {
    cache.storeHint('test-connection', 'test-hint')
    cache.openBreaker() // generation changes
    const hint = cache.getHint('test-connection')
    // Hint should be evicted when generation mismatches
    expect(hint).toBeNull()
  })
})