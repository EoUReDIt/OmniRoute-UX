import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter } from '@/lib/rate-limiter'

describe('Rate limit enforcement on /api/settings', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter({ 
      windowMs: 60000, 
      max: 10, 
      keyPrefix: 'settings-user' 
    })
  })

  it('should enforce per-user rate limit', async () => {
    // Simulate 11 requests from same user
    for (let i = 0; i < 11; i++) {
      const allowed = await limiter.consume('user-123')
      if (i >= 10) {
        expect(allowed).toBe(false)
      }
    }
  })

  it('should enforce per-IP rate limit', async () => {
    const ipLimiter = new RateLimiter({ 
      windowMs: 60000, 
      max: 5, 
      keyPrefix: 'settings-ip' 
    })
    // Simulate 6 requests from same IP
    for (let i = 0; i < 6; i++) {
      const allowed = await ipLimiter.consume('192.168.1.1')
      if (i >= 5) {
        expect(allowed).toBe(false)
      }
    }
  })
})