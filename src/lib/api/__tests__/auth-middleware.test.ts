import { describe, it, expect, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { requireManagementAuth } from '@/lib/api/requireManagementAuth'

describe('Auth middleware on new routes', () => {
  beforeEach(() => {
    // Mock requireManagementAuth to always return 401
    vi.spyOn(require('@/lib/api/requireManagementAuth'), 'requireManagementAuth')
      .mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  })

  it('GET /api/settings should return 401 without auth', async () => {
    const response = await fetch('/api/settings', { method: 'GET' })
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 on any new ux/simple-mode routes', async () => {
    const response = await fetch('/api/settings/feature-flags', { method: 'GET' })
    expect(response.status).toBe(401)
  })
})