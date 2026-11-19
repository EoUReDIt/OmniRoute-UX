import { describe, it, expect, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/db/settings'

describe('Secret redaction on GET /api/settings', () => {
  beforeEach(() => {
    // Mock management auth to always fail (no auth = 401)
    vi.spyOn(require('@/lib/api/requireManagementAuth'), 'requireManagementAuth')
      .mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  })

  it('should never return decrypted OIDC secrets', async () => {
    const response = await fetch('/api/settings', { method: 'GET' })
    const data = await response.json()
    // OIDC secrets must be redacted - only config flags, never decrypted values
    expect(data.oidcClientSecret).toBeUndefined()
    expect(data.oidcClientSecretConfigured).toBeTruthy()
  })

  it('should never return decrypted enterGraph secrets', async () => {
    const response = await fetch('/api/settings', { method: 'GET' })
    const data = await response.json()
    expect(data.enterGraphApiKey).toBeUndefined()
    expect(data.enterGraphConfigured).toBeTruthy()
  })
})